const nodemailer = require("nodemailer");
const format = require('string-format');

const transporter = nodemailer.createTransport({
  host: "mail.shinymark.com",
  port: 25,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: "erp-notify",
    pass: "en*8170",
  },
});


async function mail(msg) {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"erp-notify" <erp-notify@shinymark.com>', // sender address
    bcc: '"erp-notify" <erp-notify@shinymark.com>',
    to: msg.To, // list of receivers
    subject: msg.Subject, // Subject line
    text: msg.MailBody, // plain text body
    //html: msg.MailBody, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
}





module.exports = {
  mail: mail,

};