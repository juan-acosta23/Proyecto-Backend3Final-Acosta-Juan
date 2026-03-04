const nodemailer = require('nodemailer');

console.log('nodemailer importado:', nodemailer);
console.log('Tipo de createTransporter:', typeof nodemailer.createTransporter);

try {
    const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: 'test@gmail.com',
            pass: 'test'
        }
    });
    console.log('✓ Transporter creado exitosamente');
} catch (error) {
    console.error('✗ Error:', error);
}