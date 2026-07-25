import { test, expect } from '@playwright/test';

test.describe('ClinicOS End-to-End Clinic Workflow', () => {
  
  test('should register a new clinic, view dashboard, and log out successfully', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueClinicCode = `sunny-pw-${timestamp}`;
    const adminEmail = `admin-${timestamp}@sunny.com`;
    const adminName = `Sunny Admin ${timestamp}`;

    // 1. Navigate to UI homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/ClinicOS/);

    // 2. Click the 'Register New Clinic' tab
    await page.click('button:has-text("Register New Clinic")');

    // 3. Fill in Clinic Configuration
    await page.fill('input[placeholder="City Care Clinic"]', 'Sunny Dental Clinic');
    await page.fill('input[placeholder="city-care (auto-generated if empty)"]', uniqueClinicCode);
    await page.fill('input[placeholder="contact@citycare.com"]', `sunny-clinic-${timestamp}@sunny.com`);
    await page.fill('input[placeholder="+91 9998887776"]', '9988776655');
    await page.fill('input[placeholder="123 Care Street, Medical Block, Mumbai"]', '123 Sunny Road, Bangalore');

    // 4. Fill in Administrator User Profile
    await page.fill('input[placeholder="Dr. Rajesh Sharma"]', 'Dr. Sunny');
    await page.fill('input[placeholder="Rajesh Admin"]', adminName);
    await page.fill('input[placeholder="admin@citycare.com"]', adminEmail);
    await page.fill('input[placeholder="9998887776"]', '9988776655');
    await page.fill('input[placeholder="•••••••• (Min 6 characters)"]', 'password123');

    // 5. Submit the registration form
    await page.click('button:has-text("Register and Setup Clinic")');

    // 6. Verify successful redirect to the Dashboard homepage
    await page.waitForURL('**/');
    await expect(page.locator('h1')).toContainText(`Welcome back, ${adminName}`);

    // 7. Verify dashboard metrics cards are visible
    await expect(page.locator('text=Total Patients')).toBeVisible();
    await expect(page.locator('text=Total Doctors')).toBeVisible();
    await expect(page.locator('text=Active Prescriptions')).toBeVisible();

    // 8. Verify the activity logs table shows the registration event
    await expect(page.locator('text=Clinic Activity Logs')).toBeVisible();
    await expect(page.locator('text=CLINIC_REGISTERED')).toBeVisible();

    // 9. Sign out
    await page.click('button:has-text("Logout")');

    // 10. Verify redirect back to Login screen
    await page.waitForURL('**/login');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });
});
