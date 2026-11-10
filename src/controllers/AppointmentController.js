import { Op } from 'sequelize';
import Appointment from '../models/Appointment.js';
import Profile from '../models/Profile.js';
import ResearchBlock from '../models/ResearchBlock.js';
import SubjectArea from '../models/SubjectArea.js';
import { dayKey, fmtTime } from '../utils/view-helpers.js';
import { notifyTeacherOfAppointment } from '../services/appointmentNotificationService.js';

export const SLOTS = ['09:00', '10:30', '14:00', '15:30', '17:00']; // horários oferecidos (Recife)
export const DURATION_MS = 50 * 60 * 1000;                           // aula avaliativa de 50 minutos
const PROFILE_TAGS = ['TDAH', 'Autismo', 'Altas Habilidades', 'Ansiedade acadêmica', 'Sem diagnóstico'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Retorna o motivo da indisponibilidade ou null se o intervalo estiver livre. */
export async function unavailableReason(start, end, ignoreId = null) {
  const overlap = { start_time: { [Op.lt]: end }, end_time: { [Op.gt]: start } };
  if (await ResearchBlock.count({ where: overlap })) return 'Este horário está reservado para a pesquisa na UFPE.';
  const where = { ...overlap, status: 'CONFIRMED' };
  if (ignoreId) where.id = { [Op.ne]: ignoreId };
  if (await Appointment.count({ where })) return 'Já existe uma aula confirmada neste horário.';
  return null;
}

class AppointmentController {
  // POST /appointments — solicitação de aula avaliativa (pública; vincula o aluno se houver sessão STUDENT)
  async store(req, res) {
    try {
      const b = req.body || {};
      const area = UUID.test(String(b.subject_area_id || ''))
        ? await SubjectArea.findByPk(b.subject_area_id)
        : null;
      if (!area) {
        return res.status(400).json({ error: 'Escolha uma área do conhecimento.' });
      }
      const start = new Date(b.start_time);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Escolha uma data e um horário.' });
      if (start.getTime() <= Date.now()) return res.status(400).json({ error: 'Escolha um horário futuro.' });
      if (!SLOTS.includes(fmtTime(start))) return res.status(400).json({ error: 'Horário inválido.' });

      const sessionUser = req.session?.user;
      const profile = sessionUser?.role === 'STUDENT'
        ? await Profile.findOne({ where: { user_id: sessionUser.id } })
        : null;
      const studentName = clean(
        profile?.full_name || (sessionUser?.role === 'STUDENT' ? sessionUser.full_name : b.student_name),
        120,
      );
      const guardian = clean(
        profile?.guardian_name
          ? `${profile.guardian_name} • ${profile.guardian_phone} • ${profile.guardian_relationship}`
          : b.guardian_contact,
        160,
      );
      if (studentName.length < 2) return res.status(400).json({ error: 'Informe o nome do estudante.' });
      if (guardian.length < 5) return res.status(400).json({ error: 'Informe o contato do responsável.' });

      const end = new Date(start.getTime() + DURATION_MS);
      const reason = await unavailableReason(start, end);
      if (reason) return res.status(409).json({ error: reason });

      const tags = (Array.isArray(b.profile) ? b.profile : []).filter((t) => PROFILE_TAGS.includes(t));
      const lines = [`Estudante: ${studentName}`, `Responsável: ${guardian}`];
      if (tags.length) lines.push(`Perfil: ${tags.join(', ')}`);
      const obs = clean(b.observations, 1500);
      if (obs) lines.push(`Observações: ${obs}`);

      const created = await Appointment.create({
        student_id: sessionUser && sessionUser.role === 'STUDENT' ? sessionUser.id : null,
        subject_area_id: b.subject_area_id,
        start_time: start,
        end_time: end,
        status: 'PENDING',
        notes: lines.join('\n'),
      });

      const protocol = `ST-${dayKey(start).slice(2).replace(/-/g, '')}-${created.id.slice(0, 3).toUpperCase()}`;
      created.protocol = protocol;

      let emailNotification;
      try {
        emailNotification = await notifyTeacherOfAppointment({
          appointment: created,
          area,
          studentName,
          guardian,
        });
      } catch (notificationError) {
        console.error(`Falha ao enviar notificação por e-mail do agendamento ${created.id}:`, notificationError);
        emailNotification = { status: 'failed' };
      }

      return res.status(201).json({
        message: 'Solicitação enviada com sucesso.',
        id: created.id,
        status: created.status,
        protocol,
        emailNotification: emailNotification.status,
      });
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return res.status(500).json({ error: 'Não foi possível enviar a solicitação. Tente novamente.' });
    }
  }

  // PATCH /admin/appointments/:id/status — aprovar (CONFIRMED) ou cancelar (CANCELLED)
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const status = String(req.body?.status || '');
      const allowed = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['CANCELLED'] };
      if (!UUID.test(id)) return res.status(404).json({ error: 'Agendamento não encontrado.' });
      const appt = await Appointment.findByPk(id);
      if (!appt) return res.status(404).json({ error: 'Agendamento não encontrado.' });
      if (!(allowed[appt.status] || []).includes(status)) {
        return res.status(409).json({ error: 'Esta mudança de status não é permitida.' });
      }
      if (status === 'CONFIRMED') {
        const reason = await unavailableReason(appt.start_time, appt.end_time, appt.id);
        if (reason) return res.status(409).json({ error: reason });
      }
      appt.status = status;
      await appt.save();
      return res.status(200).json({ message: 'Status atualizado.', id: appt.id, status: appt.status });
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return res.status(500).json({ error: 'Não foi possível atualizar o agendamento.' });
    }
  }
}

export default new AppointmentController();
