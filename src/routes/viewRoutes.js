import { Router } from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import SubjectArea from '../models/SubjectArea.js';
import Appointment from '../models/Appointment.js';
import ResearchBlock from '../models/ResearchBlock.js';
import Material from '../models/Material.js';
import Submission from '../models/Submission.js';
import { AREAS, parseNotes, dayKey, fmtTime, weekdayIdx } from '../utils/view-helpers.js';
import { SLOTS } from '../controllers/AppointmentController.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 24 * 60 * 60 * 1000;

/* Guarda de páginas: redireciona em vez de devolver JSON */
const page = (roles) => (req, res, next) => {
  const u = req.session?.user;
  if (!u) return res.redirect('/login');
  if (roles && !roles.includes(u.role)) return res.redirect(u.role === 'TEACHER' ? '/admin/dashboard' : '/student/dashboard');
  return next();
};
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (res, message) => res.status(404).render('error', { code: 404, message });

/* ---------- carregamento de dados (sem includes, para não depender de aliases não conhecidos) ---------- */
async function loadAreas() {
  const rows = await SubjectArea.findAll({ raw: true });
  const order = Object.keys(AREAS);
  if (!rows.length) return order.map((code) => ({ id: null, code, name: AREAS[code].label, color_hex: AREAS[code].color }));
  return rows.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
}

async function loadStudents() {
  const rows = await User.findAll({ where: { role: 'STUDENT' }, include: [{ model: Profile, as: 'profile' }] });
  return rows
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: u.profile?.full_name || u.email,
      phone: u.profile?.phone || '',
      guardian_name: u.profile?.guardian_name || '',
      guardian_phone: u.profile?.guardian_phone || '',
      guardian_relationship: u.profile?.guardian_relationship || '',
      notes: u.profile?.special_needs_notes || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

async function loadCtx() {
  const [areas, students] = await Promise.all([loadAreas(), loadStudents()]);
  return {
    areas,
    students,
    areasById: Object.fromEntries(areas.map((a) => [a.id, a])),
    studentsById: Object.fromEntries(students.map((s) => [s.id, s])),
  };
}

const PHONE = /\(?\d{2}\)?[\s-]?9?\d{4}[-\s]?\d{4}/;
function decorate(a, ctx) {
  const area = ctx.areasById[a.subject_area_id] || null;
  const student = a.student_id ? ctx.studentsById[a.student_id] : null;
  const n = parseNotes(a.notes);
  const phone = student?.phone || (n.guardian.match(PHONE) || [''])[0];
  return {
    id: a.id,
    status: a.status,
    start: a.start_time,
    end: a.end_time,
    createdAt: a.createdAt || null,
    areaCode: area?.code || '',
    areaName: area?.name || '—',
    name: n.student || student?.name || 'Visitante',
    phone,
    phoneDigits: phone.replace(/\D/g, ''),
    guardian: n.guardian,
    tags: n.tags,
    observations: n.observations || student?.notes || '',
  };
}

/* ---------- públicas ---------- */
router.get('/', wrap(async (req, res) => {
  res.render('public/index', { subjectAreas: await loadAreas() });
}));

router.get('/login', (req, res) => {
  const u = req.session?.user;
  if (u) return res.redirect(u.role === 'TEACHER' ? '/admin/dashboard' : '/student/dashboard');
  return res.render('auth/login');
});

router.get('/cadastro', (req, res) => {
  const u = req.session?.user;
  if (u) return res.redirect(u.role === 'TEACHER' ? '/admin/dashboard' : '/student/dashboard');
  return res.render('auth/register');
});

router.get('/agendar', wrap(async (req, res) => {
  const areas = await loadAreas();
  const now = new Date();
  const [blocks, confirmed] = await Promise.all([
    ResearchBlock.findAll({ where: { end_time: { [Op.gte]: now } }, raw: true }),
    Appointment.findAll({ where: { status: 'CONFIRMED', end_time: { [Op.gte]: now } }, raw: true }),
  ]);
  // Só intervalos: nenhum dado pessoal vai para o navegador de visitantes
  const busy = [
    ...blocks.map((b) => ({ type: 'block', start: b.start_time, end: b.end_time })),
    ...confirmed.map((a) => ({ type: 'appt', start: a.start_time, end: a.end_time })),
  ];
  const q = req.query;
  const sessionUser = req.session?.user;
  const studentProfile = sessionUser?.role === 'STUDENT'
    ? await Profile.findOne({ where: { user_id: sessionUser.id }, raw: true })
    : null;
  const wanted = String(q.area || '');
  const area = areas.find((a) => a.code === wanted || a.id === wanted);
  const prefill = {
    areaId: area?.id || null,
    studentName: String(q.name || (sessionUser?.role === 'STUDENT' ? studentProfile?.full_name || sessionUser.full_name : '') || '').slice(0, 120),
    contact: (sessionUser?.role === 'STUDENT' && studentProfile?.guardian_name
      ? `${studentProfile.guardian_name} • ${studentProfile.guardian_phone} • ${studentProfile.guardian_relationship}`
      : [q.phone, q.email].filter(Boolean).join(' • ')).slice(0, 160),
    registeredStudent: sessionUser?.role === 'STUDENT',
    observations: String(q.notes || '').slice(0, 1500),
  };
  res.render('public/schedule', { subjectAreas: areas, boot: { areas: areas.map((a) => ({ id: a.id, code: a.code, name: a.name })), busy, slots: SLOTS, prefill } });
}));

/* ---------- aluno ---------- */
router.get('/student/dashboard', page(['STUDENT']), wrap(async (req, res) => {
  const uid = req.session.user.id;
  const ctx = await loadCtx();
  const now = new Date();
  const mine = { [Op.or]: [{ target_student_id: null }, { target_student_id: uid }] };
  const [appts, mats, totalMaterials, confirmedCount] = await Promise.all([
    Appointment.findAll({ where: { student_id: uid, status: { [Op.ne]: 'CANCELLED' }, end_time: { [Op.gte]: now } }, order: [['start_time', 'ASC']], limit: 5, raw: true }),
    Material.findAll({ where: mine, order: [['createdAt', 'DESC']], limit: 9, raw: true }),
    Material.count({ where: mine }),
    Appointment.count({ where: { student_id: uid, status: 'CONFIRMED', end_time: { [Op.gte]: now } } }),
  ]);
  res.render('student/dashboard', {
    appointments: appts.map((a) => decorate(a, ctx)),
    materials: mats.map((m) => ({ ...m, area: ctx.areasById[m.subject_area_id] || null })),
    stats: { totalMaterials, confirmedCount },
  });
}));

router.get('/student/materials/:id', page(['STUDENT']), wrap(async (req, res) => {
  if (!UUID.test(req.params.id)) return notFound(res, 'Material não encontrado.');
  const m = await Material.findByPk(req.params.id, { raw: true });
  if (!m || (m.target_student_id && m.target_student_id !== req.session.user.id)) return notFound(res, 'Material não encontrado.');
  const ctx = await loadCtx();
  res.render('student/material', { material: { ...m, area: ctx.areasById[m.subject_area_id] || null } });
}));

router.get('/student/submissions', page(['STUDENT']), wrap(async (req, res) => {
  const submissions = await Submission.findAll({
    where: { student_id: req.session.user.id },
    order: [['createdAt', 'DESC']],
    raw: true,
  });
  res.render('student/submissions', { submissions });
}));

router.get('/student/tutor', page(['STUDENT']), (req, res) => {
  res.render('student/tutor');
});

/* ---------- professora ---------- */
router.get('/admin/dashboard', page(['TEACHER']), wrap(async (req, res) => {
  const ctx = await loadCtx();
  const now = new Date();
  const [apptRows, blocks] = await Promise.all([
    Appointment.findAll({ order: [['start_time', 'ASC']], raw: true }),
    ResearchBlock.findAll({ order: [['start_time', 'ASC']], raw: true }),
  ]);
  const all = apptRows.map((a) => decorate(a, ctx));
  const pending = all.filter((a) => a.status === 'PENDING');
  const todayKey = dayKey(now);
  const in7 = new Date(now.getTime() + 7 * DAY);
  const activeBlocks = blocks.filter((b) => new Date(b.end_time) >= now);
  const nextBlock = activeBlocks.find((b) => new Date(b.start_time) >= now) || activeBlocks[0] || null;

  // "Hoje": aulas confirmadas + bloqueios que cruzam o dia
  const today = [
    ...all.filter((a) => a.status === 'CONFIRMED' && dayKey(a.start) === todayKey).map((a) => ({ time: fmtTime(a.start), label: `${a.areaName} • ${a.name}`, kind: 'class' })),
    ...blocks.filter((b) => dayKey(b.start_time) <= todayKey && dayKey(b.end_time) >= todayKey).map((b) => ({
      time: dayKey(b.start_time) === todayKey ? fmtTime(b.start_time) : '00:00',
      label: b.reason || 'Pesquisa UFPE',
      kind: 'block',
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Gráficos: últimos 30 dias (quando houver createdAt) por área e por dia da semana
  const since = new Date(now.getTime() - 30 * DAY);
  const recent = all.filter((a) => !a.createdAt || new Date(a.createdAt) >= since);
  const byArea = ctx.areas.map((ar) => ({ code: ar.code, name: ar.name, count: recent.filter((a) => a.areaCode === ar.code).length }));
  const byDay = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => ({ label, count: recent.filter((a) => weekdayIdx(a.start) === i).length }));

  res.render('admin/dashboard', {
    kpis: {
      pending: pending.length,
      overdue: pending.filter((a) => a.createdAt && now - new Date(a.createdAt) > DAY).length,
      confirmedWeek: all.filter((a) => a.status === 'CONFIRMED' && new Date(a.start) >= now && new Date(a.start) <= in7).length,
      students: ctx.students.length,
      activeBlocks: activeBlocks.length,
      nextBlock: nextBlock ? nextBlock.start_time : null,
    },
    upcoming: pending.slice(0, 4),
    today, byArea, byDay, base: recent.length,
  });
}));

router.get('/admin/students', page(['TEACHER']), wrap(async (req, res) => {
  const ctx = await loadCtx();
  const studentIds = ctx.students.map((student) => student.id);
  const now = new Date();
  let appointments = [];
  let submissions = [];
  let materials = [];

  if (studentIds.length) {
    [appointments, submissions, materials] = await Promise.all([
      Appointment.findAll({
        where: { student_id: { [Op.in]: studentIds } },
        order: [['start_time', 'DESC']],
        raw: true,
      }),
      Submission.findAll({
        where: { student_id: { [Op.in]: studentIds } },
        order: [['createdAt', 'DESC']],
        raw: true,
      }),
      Material.findAll({
        where: {
          [Op.or]: [
            { target_student_id: null },
            { target_student_id: { [Op.in]: studentIds } },
          ],
        },
        attributes: ['id', 'target_student_id'],
        raw: true,
      }),
    ]);
  }

  const students = ctx.students.map((student) => {
    const studentAppointments = appointments.filter((item) => item.student_id === student.id);
    const studentSubmissions = submissions.filter((item) => item.student_id === student.id);
    const individualMaterials = materials.filter((item) => item.target_student_id === student.id).length;
    return {
      ...student,
      appointmentCount: studentAppointments.filter((item) => item.status !== 'CANCELLED').length,
      upcomingCount: studentAppointments.filter((item) =>
        item.status !== 'CANCELLED' && new Date(item.end_time) >= now).length,
      pendingSubmissions: studentSubmissions.filter((item) => item.status === 'PENDING').length,
      materialCount: materials.filter((item) => item.target_student_id === null).length + individualMaterials,
      lastAppointment: studentAppointments[0] || null,
    };
  });

  res.render('admin/students', {
    students,
    stats: {
      total: students.length,
      withUpcoming: students.filter((student) => student.upcomingCount > 0).length,
      pendingSubmissions: students.reduce((sum, student) => sum + student.pendingSubmissions, 0),
    },
  });
}));

router.get('/admin/appointments', page(['TEACHER']), wrap(async (req, res) => {
  const ctx = await loadCtx();
  const rows = await Appointment.findAll({ order: [['start_time', 'ASC']], raw: true });
  const appointments = rows.map((a) => decorate(a, ctx));
  const counts = { ALL: appointments.length, PENDING: 0, CONFIRMED: 0, CANCELLED: 0 };
  appointments.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
  res.render('admin/appointments', { appointments, counts, subjectAreas: ctx.areas });
}));

router.get('/admin/research-blocks', page(['TEACHER']), wrap(async (req, res) => {
  const ctx = await loadCtx();
  const now = new Date();
  const [blocks, confirmed] = await Promise.all([
    ResearchBlock.findAll({ where: { end_time: { [Op.gte]: new Date(now.getTime() - 62 * DAY) } }, order: [['start_time', 'ASC']], raw: true }),
    Appointment.findAll({ where: { status: 'CONFIRMED', end_time: { [Op.gte]: now } }, raw: true }),
  ]);
  const conflicts = confirmed.map((a) => ({ start: a.start_time, end: a.end_time, name: decorate(a, ctx).name }));
  const blockList = blocks.map((b) => ({ id: b.id, start: b.start_time, end: b.end_time, reason: b.reason || 'Pesquisa Científica UFPE' }));
  res.render('admin/research-blocks', { blocks: blockList, conflicts, activeCount: blockList.filter((b) => new Date(b.end) >= now).length });
}));

router.get('/admin/materials', page(['TEACHER']), wrap(async (req, res) => {
  const ctx = await loadCtx();
  const rows = await Material.findAll({ order: [['createdAt', 'DESC']], raw: true });
  const month = dayKey(new Date()).slice(0, 7);
  const materials = rows.map((m) => ({
    ...m,
    area: ctx.areasById[m.subject_area_id] || null,
    targetName: m.target_student_id ? (ctx.studentsById[m.target_student_id]?.name || 'Aluno removido') : null,
  }));
  res.render('admin/materials', {
    materials,
    students: ctx.students,
    subjectAreas: ctx.areas,
    stats: {
      total: materials.length,
      thisMonth: materials.filter((m) => m.createdAt && dayKey(m.createdAt).slice(0, 7) === month).length,
      forClass: materials.filter((m) => !m.target_student_id).length,
      individual: materials.filter((m) => m.target_student_id).length,
    },
  });
}));

router.get('/admin/submissions', page(['TEACHER']), wrap(async (req, res) => {
  const submissions = await Submission.findAll({
    include: [{
      model: User,
      as: 'student',
      attributes: ['id', 'email'],
      include: [{ model: Profile, as: 'profile', attributes: ['full_name'] }],
    }],
    order: [['status', 'ASC'], ['createdAt', 'DESC']],
  });
  res.render('admin/submissions', { submissions });
}));

export default router;
