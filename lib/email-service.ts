import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");

// Email templates with nice HTML styling
const getEmailTemplate = (type: 'login' | 'quota-warning', data: any) => {
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
      .content { padding: 40px 30px; background-color: #f9fafb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
      .footer { background-color: #1f2937; color: #9ca3af; padding: 20px 30px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
      .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
      .alert-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px; }
      .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
      .stats { display: flex; justify-content: space-around; margin: 20px 0; }
      .stat-item { text-align: center; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; margin: 0 10px; }
      .stat-value { font-size: 32px; font-weight: 700; color: #667eea; }
      .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
    </style>
  `;

  if (type === 'login') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f3f4f6;">
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Back!</h1>
          </div>
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${data.userName}!</h2>
            <div class="info-box">
              <p style="margin: 0; color: #1f2937;"><strong>✅ Successful Login Detected</strong></p>
              <p style="margin: 10px 0 0 0; color: #4b5563;">You've successfully logged into your ScraperAPI account.</p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              <strong>Login Details:</strong>
            </p>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li><strong>Time:</strong> ${data.loginTime}</li>
              <li><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</li>
              <li><strong>Device:</strong> ${data.userAgent || 'Unknown'}</li>
            </ul>

            <div class="stats">
              <div class="stat-item">
                <div class="stat-value">${data.requestCount || 0}</div>
                <div class="stat-label">API Calls Used</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${data.requestQuota || 0}</div>
                <div class="stat-label">Total Quota</div>
              </div>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
              If this wasn't you, please secure your account immediately.
            </p>
            
            <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
          </div>
          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} ScraperAPI. All rights reserved.</p>
            <p style="margin: 10px 0 0 0;">This is an automated notification email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  if (type === 'quota-warning') {
    const usagePercentage = data.usagePercentage || 90;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f3f4f6;">
        <div class="container">
          <div class="header">
            <h1>⚠️ API Quota Alert</h1>
          </div>
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0;">Hey ${data.userName}!</h2>
            <div class="alert-box">
              <p style="margin: 0; color: #991b1b;"><strong>⚠️ You've Used ${usagePercentage}% of Your API Quota!</strong></p>
              <p style="margin: 10px 0 0 0; color: #7f1d1d;">Your API usage is approaching the limit. Consider upgrading or optimizing your usage.</p>
            </div>
            
            <div class="stats">
              <div class="stat-item">
                <div class="stat-value">${data.requestCount || 0}</div>
                <div class="stat-label">Calls Used</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${data.requestQuota || 0}</div>
                <div class="stat-label">Total Quota</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${data.remainingCalls || 0}</div>
                <div class="stat-label">Remaining</div>
              </div>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
              <strong>What happens next?</strong>
            </p>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>Once you reach 100% of your quota, API requests will be rejected</li>
              <li>Your quota resets on: <strong>${data.quotaResetDate || 'N/A'}</strong></li>
              <li>Consider upgrading your plan for higher limits</li>
            </ul>

            <p style="color: #4b5563; line-height: 1.6;">
              You can monitor your usage in real-time from your dashboard.
            </p>
            
            <a href="${data.dashboardUrl}" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} ScraperAPI. All rights reserved.</p>
            <p style="margin: 10px 0 0 0;">Manage your notifications in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  return '';
};

export async function sendLoginNotification(data: {
  email: string;
  userName: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
  requestCount?: number;
  requestQuota?: number;
}) {
  try {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
    
    const { data: emailData, error } = await resend.emails.send({
      from: 'ScraperAPI <onboarding@screenscapeapi.dev>',
      to: [data.email],
      subject: '🔐 New Login Detected - ScraperAPI',
      html: getEmailTemplate('login', { ...data, dashboardUrl }),
    });

    if (error) {
      console.error('Failed to send login notification:', error);
      return { success: false, error };
    }

    console.log('Login notification sent successfully:', emailData);
    return { success: true, data: emailData };
  } catch (error) {
    console.error('Error sending login notification:', error);
    return { success: false, error };
  }
}

export async function sendQuotaWarningEmail(data: {
  email: string;
  userName: string;
  requestCount: number;
  requestQuota: number;
  usagePercentage: number;
  quotaResetDate?: string;
}) {
  try {
    const remainingCalls = data.requestQuota - data.requestCount;
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
    
    const { data: emailData, error } = await resend.emails.send({
      from: 'ScraperAPI <onboarding@screenscapeapi.dev>',
      to: [data.email],
      subject: `⚠️ API Quota Alert: ${data.usagePercentage}% Used - ScraperAPI`,
      html: getEmailTemplate('quota-warning', { 
        ...data, 
        remainingCalls,
        dashboardUrl 
      }),
    });

    if (error) {
      console.error('Failed to send quota warning email:', error);
      return { success: false, error };
    }

    console.log('Quota warning email sent successfully:', emailData);
    return { success: true, data: emailData };
  } catch (error) {
    console.error('Error sending quota warning email:', error);
    return { success: false, error };
  }
}

// Helper function to check if quota warning should be sent
export function shouldSendQuotaWarning(requestCount: number, requestQuota: number): boolean {
  if (requestQuota === 0) return false;
  const usagePercentage = (requestCount / requestQuota) * 100;
  return usagePercentage >= 90 && usagePercentage < 95; // Send warning between 90-95%
}

// Calculate usage percentage
export function calculateUsagePercentage(requestCount: number, requestQuota: number): number {
  if (requestQuota === 0) return 0;
  return Math.round((requestCount / requestQuota) * 100);
}
