# Notificações de agendamento

Cada nova solicitação de aula é salva como pendente e, se o SMTP estiver
configurado, o Habitat envia um e-mail para `APPOINTMENT_NOTIFICATION_EMAIL`.
Falhas de envio não apagam nem invalidam o agendamento; a tela de confirmação
informa se o aviso foi enviado, não está configurado ou falhou.

## Gmail SMTP

1. Na conta Gmail que enviará as notificações, ative a verificação em duas
   etapas e gere uma senha de app nas configurações de segurança do Google.
2. No `.env` local, configure:

   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=conta-que-envia@gmail.com
   SMTP_PASS=senha-de-app-do-google
   SMTP_FROM="Habitat <conta-que-envia@gmail.com>"
   APPOINTMENT_NOTIFICATION_EMAIL=rhuannalluna@gmail.com
   ```

3. Reinicie o servidor Node.js.
4. Faça uma solicitação de teste com dados autorizados e verifique a caixa de
   entrada e a pasta de spam do endereço de notificação.

Não use a senha normal da conta Google, não compartilhe credenciais no chat e
nunca versione o arquivo `.env`.

## WhatsApp

O link `wa.me` abre uma conversa, mas não consegue enviar notificações
automaticamente. Para envio pelo servidor é necessária uma integração oficial
com WhatsApp Business Platform/Cloud API, número empresarial verificado,
token armazenado localmente e configuração de consentimento e templates. Essa
integração não é ativada por este serviço de e-mail.
