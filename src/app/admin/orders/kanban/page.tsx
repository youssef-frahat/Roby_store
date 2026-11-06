'use client';

import React from 'react';
import AdminOrdersPage from '../page';

export default function AdminOrdersKanbanRoute() {
  return <AdminOrdersPage searchParams={{ view: 'kanban' }} />;
}
