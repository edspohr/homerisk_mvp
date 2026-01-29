import * as nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import { RiskAnalysis } from "@homerisk/common";

dotenv.config();

const transporter = nodemailer.createTransport({
    // For MVP, we can use a generic SMTP. 
    // If using Gmail, 'service: "gmail"' requires App Password.
    // Ideally this comes from env vars.
    service: process.env.EMAIL_SERVICE || "gmail", 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function generateHtmlTemplate(address: string, analysis: RiskAnalysis): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .score { font-size: 24px; font-weight: bold; color: #2563eb; }
            .section { margin-bottom: 20px; padding: 15px; background-color: #f9fafb; border-radius: 6px; }
            .risk-high { color: #dc2626; font-weight: bold; }
            .risk-med { color: #d97706; font-weight: bold; }
            .risk-low { color: #16a34a; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Reporte HomeRisk</h1>
                <p>${address}</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Hola,</p>
                <p>Tu análisis de riesgo ha sido completado. Aquí está el resumen:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p>Puntaje General de Riesgo</p>
                    <p class="score">${analysis.overall_score}/10</p>
                    <p><em>${analysis.summary}</em></p>
                </div>

                <div class="section">
                    <h3>⚡ Suministro Eléctrico</h3>
                    <p>Riesgo: <span class="${getRiskClass(analysis.categories.power_supply.score)}">${analysis.categories.power_supply.score}/10</span></p>
                    <p>${analysis.categories.power_supply.details}</p>
                </div>

                <div class="section">
                    <h3>🛡️ Seguridad</h3>
                    <p>Riesgo: <span class="${getRiskClass(analysis.categories.security.score)}">${analysis.categories.security.score}/10</span></p>
                    <p>${analysis.categories.security.details}</p>
                </div>

                <div class="section">
                    <h3>🌊 Eventos Naturales</h3>
                    <p>Riesgo: <span class="${getRiskClass(analysis.categories.natural_events.score)}">${analysis.categories.natural_events.score}/10</span></p>
                    <p>${analysis.categories.natural_events.details}</p>
                </div>

                <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
                    Generado por HomeRisk AI. La información está basada en fuentes públicas y es referencial.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function getRiskClass(score: number): string {
    if (score >= 7) return "risk-high";
    if (score >= 4) return "risk-med";
    return "risk-low";
}

export async function sendRiskReportEmail(toLabel: string, address: string, analysis: RiskAnalysis) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Emails credentials not set. Skipping email sending.");
        return;
    }

    const html = generateHtmlTemplate(address, analysis);

    try {
        const info = await transporter.sendMail({
            from: '"HomeRisk Bot" <' + process.env.EMAIL_USER + '>', // sender address
            to: toLabel, // list of receivers
            subject: `Reporte de Riesgo para: ${address}`, // Subject line
            html: html, // html body
        });
        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}
