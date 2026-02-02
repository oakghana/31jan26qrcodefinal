import re
import os

files_to_fix = [
    "app/dashboard/page.tsx",
    "app/dashboard/audit-logs/page.tsx",
    "app/dashboard/reports/page.tsx",
    "app/dashboard/settings/backup/page.tsx",
    "app/dashboard/profile/page.tsx",
    "app/dashboard/overview/dashboard-overview-client.tsx",
    "app/dashboard/leave-notifications/leave-notifications-client.tsx",
    "app/dashboard/leave-management/leave-management-client.tsx",
    "app/dashboard/instructor/page.tsx",
    "app/dashboard/excuse-duty-review/page.tsx",
    "app/dashboard/data-management/page.tsx",
    "app/dashboard/analytics/page.tsx",
    "app/dashboard/attendance-tracking/page.tsx",
    "app/dashboard/settings/device-radius/page.tsx"
]

for file_path in files_to_fix:
    full_path = file_path.replace("/", os.sep)
    if not os.path.exists(full_path):
        print(f"SKIP: {file_path} - not found")
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove import statement
    content = re.sub(r'import \{ DashboardLayout \} from "@/components/dashboard/dashboard-layout"\n', '', content)
    content = re.sub(r'import DashboardLayout from "@/components/dashboard/dashboard-layout"\n', '', content)
    
    # Remove JSX tags with proper handling of whitespace
    # Match <DashboardLayout...> with optional props
    content = re.sub(r'<DashboardLayout[^>]*>\s*\n?', '', content, flags=re.MULTILINE)
    content = re.sub(r'\s*</DashboardLayout>\s*\n?', '', content, flags=re.MULTILINE)
    
    with open(full_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    
    print(f"FIXED: {file_path}")

print("\nAll files processed!")
