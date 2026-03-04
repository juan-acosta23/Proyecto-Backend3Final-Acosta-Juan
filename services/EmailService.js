const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.twilioClient = null;
        this.twilioPhone = null;
        
        this.initializeNodemailer();
        this.initializeTwilio();
    }

    initializeNodemailer() {
        try {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
                console.warn('⚠️ EmailService: Variables de email no configuradas');
                return;
            }

            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            console.log('✓ EmailService: Nodemailer configurado');
        } catch (error) {
            console.error('✗ EmailService: Error configurando Nodemailer:', error.message);
        }
    }

    initializeTwilio() {
        try {
            if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
                console.warn('⚠️ EmailService: Twilio no configurado (opcional)');
                return;
            }

            const twilio = require('twilio');
            this.twilioClient = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
            this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;
            console.log('✓ EmailService: Twilio configurado');
        } catch (error) {
            console.warn('⚠️ EmailService: Error configurando Twilio:', error.message);
        }
    }

    async sendPasswordResetEmail(email, token, userName) {
        try {
            if (!this.transporter) {
                throw new Error('Nodemailer no está configurado');
            }

            const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Recuperación de Contraseña - E-commerce',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                                background: #f4f4f4;
                            }
                            .content {
                                background: white;
                                padding: 30px;
                                border-radius: 10px;
                            }
                            .button {
                                display: inline-block;
                                padding: 12px 30px;
                                background: #667eea;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                                margin: 20px 0;
                            }
                            .warning {
                                background: #fff3cd;
                                padding: 15px;
                                border-left: 4px solid #ffc107;
                                margin: 20px 0;
                            }
                            .footer {
                                text-align: center;
                                margin-top: 20px;
                                color: #666;
                                font-size: 12px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="content">
                                <h2 style="color: #667eea;">Recuperación de Contraseña</h2>
                                <p>Hola ${userName},</p>
                                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                                <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                                <div style="text-align: center;">
                                    <a href="${resetLink}" class="button">Restablecer Contraseña</a>
                                </div>
                                <div class="warning">
                                    <strong>⚠️ Importante:</strong>
                                    <ul>
                                        <li>Este enlace expirará en <strong>1 hora</strong></li>
                                        <li>Si no solicitaste este cambio, ignora este correo</li>
                                        <li>No puedes usar tu contraseña anterior</li>
                                    </ul>
                                </div>
                                <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                                <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
                            </div>
                            <div class="footer">
                                <p>Este es un correo automático, por favor no respondas.</p>
                                <p>&copy; ${new Date().getFullYear()} E-commerce. Todos los derechos reservados.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✓ Email de recuperación enviado:', result.messageId);
            return result;
        } catch (error) {
            console.error('✗ Error al enviar email de recuperación:', error);
            throw new Error(`Error al enviar email: ${error.message}`);
        }
    }

    async sendPurchaseConfirmation(email, ticket, userName) {
        try {
            if (!this.transporter) {
                throw new Error('Nodemailer no está configurado');
            }

            const productsHTML = ticket.products.map(item => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product.title}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">$${item.price.toFixed(2)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">$${item.subtotal.toFixed(2)}</td>
                </tr>
            `).join('');

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Confirmación de Compra - Ticket ${ticket.code}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                                background: #f4f4f4;
                            }
                            .content {
                                background: white;
                                padding: 30px;
                                border-radius: 10px;
                            }
                            .success {
                                background: #d4edda;
                                padding: 15px;
                                border-left: 4px solid #28a745;
                                margin: 20px 0;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin: 20px 0;
                            }
                            th {
                                background: #667eea;
                                color: white;
                                padding: 12px;
                                text-align: left;
                            }
                            .total {
                                background: #f8f9fa;
                                padding: 15px;
                                text-align: right;
                                font-size: 1.2em;
                                font-weight: bold;
                                margin-top: 20px;
                            }
                            .footer {
                                text-align: center;
                                margin-top: 20px;
                                color: #666;
                                font-size: 12px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="content">
                                <h2 style="color: #28a745;">¡Compra Exitosa!</h2>
                                <p>Hola ${userName},</p>
                                <div class="success">
                                    <strong>✓ Tu compra ha sido procesada exitosamente</strong>
                                </div>
                                <p><strong>Código de Ticket:</strong> ${ticket.code}</p>
                                <p><strong>Fecha:</strong> ${new Date(ticket.purchase_datetime).toLocaleString('es-AR')}</p>
                                
                                <h3>Detalle de la Compra:</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th style="text-align: center;">Precio</th>
                                            <th style="text-align: center;">Cantidad</th>
                                            <th style="text-align: right;">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${productsHTML}
                                    </tbody>
                                </table>
                                
                                <div class="total">
                                    Total: $${ticket.amount.toFixed(2)}
                                </div>
                                
                                <p>Puedes ver el detalle completo de tu compra en tu historial de pedidos.</p>
                                <p>¡Gracias por tu compra!</p>
                            </div>
                            <div class="footer">
                                <p>Este es un correo automático, por favor no respondas.</p>
                                <p>&copy; ${new Date().getFullYear()} E-commerce. Todos los derechos reservados.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✓ Email de confirmación enviado:', result.messageId);
            return result;
        } catch (error) {
            console.error('✗ Error al enviar email de confirmación:', error);
            throw new Error(`Error al enviar email: ${error.message}`);
        }
    }

    async sendSMS(phoneNumber, message) {
        try {
            if (!this.twilioClient) {
                console.warn('⚠️ Twilio no está configurado. Saltando envío de SMS.');
                return null;
            }

            const result = await this.twilioClient.messages.create({
                body: message,
                from: this.twilioPhone,
                to: phoneNumber
            });

            console.log('✓ SMS enviado:', result.sid);
            return result;
        } catch (error) {
            console.error('✗ Error al enviar SMS:', error);
            throw new Error(`Error al enviar SMS: ${error.message}`);
        }
    }

    async sendPurchaseSMS(phoneNumber, ticketCode, amount) {
        try {
            const message = `¡Compra exitosa! Ticket: ${ticketCode}. Total: $${amount}. Gracias por tu compra.`;
            return await this.sendSMS(phoneNumber, message);
        } catch (error) {
            console.error('✗ Error al enviar SMS de compra:', error);
            return null;
        }
    }

    async sendWhatsApp(phoneNumber, message) {
        try {
            if (!this.twilioClient) {
                console.warn('⚠️ Twilio no está configurado. Saltando envío de WhatsApp.');
                return null;
            }

            const result = await this.twilioClient.messages.create({
                body: message,
                from: `whatsapp:${this.twilioPhone}`,
                to: `whatsapp:${phoneNumber}`
            });

            console.log('✓ WhatsApp enviado:', result.sid);
            return result;
        } catch (error) {
            console.error('✗ Error al enviar WhatsApp:', error);
            return null;
        }
    }
}

module.exports = new EmailService();