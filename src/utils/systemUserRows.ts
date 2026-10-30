// Shapes and helpers shared by the staff pages. They live here, not in a page file: Next.js only allows a page to export the page itself.

export interface AssignedSession {
  id: string;
  name: string;
  time?: string;
}

export interface AssignedEventCard {
  id: string;
  eventName: string;
  dateStr?: string;
  assignedBy?: string;
  assignedAt?: string;
  sessions: AssignedSession[];
}

export interface SystemUserRow {
  id: string; // User ID
  name: string;
  email: string;
  phone: string;
  role: string;
  assignments: {
    assignmentId: string;
    eventId: string;
    eventName: string;
    dateStr?: string;
    assignedBy?: string;
    assignedAt?: string;
    sessions: { id: string; name: string; time?: string }[];
  }[];
  assignedEvents?: AssignedEventCard[];
}

export const getAssignedCountText = (assignments: SystemUserRow["assignments"] = []): string => {
  const eventCount = assignments.length;
  let sessionCount = 0;
  assignments.forEach((a) => {
    sessionCount += a.sessions?.length || 0;
  });

  const eventLabel = eventCount === 1 ? "1 Event" : `${eventCount} Events`;
  const sessionLabel = sessionCount === 1 ? "1 Session" : `${sessionCount} Sessions`;
  return `${eventLabel} & ${sessionLabel}`;
};
