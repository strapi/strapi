const subject = `Two-factor authentication was <%= change %>`;

const html = `<p>Hi <%= user.firstname %>,</p>

<p>Two-factor authentication was <%= change %> on your account on <%= changedAt %>.</p>

<p>If you didn't make this change, contact your administrator.</p>`;

const text = `Hi <%= user.firstname %>,

Two-factor authentication was <%= change %> on your account on <%= changedAt %>.

If you didn't make this change, contact your administrator.`;

export default { subject, text, html };
