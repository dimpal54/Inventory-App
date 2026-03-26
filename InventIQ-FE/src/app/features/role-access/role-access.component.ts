import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-role-access',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './role-access.component.html',
  styleUrl: './role-access.component.scss'
})
export class RoleAccessComponent {
  readonly roles = [
    {
      name: 'Admin',
      summary: 'Full system control',
      access: ['View all data', 'Add records', 'Edit records', 'Delete records', 'Assign roles', 'Manage users', 'Use AI write actions', 'Open role access page']
    },
    {
      name: 'Manager',
      summary: 'Operational control',
      access: ['View all data', 'Add records', 'Edit records', 'Delete records', 'Use AI write actions']
    },
    {
      name: 'Supervisor',
      summary: 'Read-only monitoring',
      access: ['View all data', 'Use AI for read-only insights']
    },
    {
      name: 'User',
      summary: 'Basic read-only access',
      access: ['View all data', 'Use AI for read-only insights']
    }
  ];

  readonly permissionMatrix = [
    { label: 'View Data', admin: true, manager: true, supervisor: true, user: true },
    { label: 'Add Data', admin: true, manager: true, supervisor: false, user: false },
    { label: 'Edit Data', admin: true, manager: true, supervisor: false, user: false },
    { label: 'Delete Data', admin: true, manager: true, supervisor: false, user: false },
    { label: 'Assign Roles', admin: true, manager: false, supervisor: false, user: false },
    { label: 'Manage Users', admin: true, manager: false, supervisor: false, user: false },
    { label: 'AI Read Access', admin: true, manager: true, supervisor: true, user: true },
    { label: 'AI Create/Edit/Delete', admin: true, manager: true, supervisor: false, user: false }
  ];
}
