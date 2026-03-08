export interface TokaniIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  accentColor?: string;
}

const DEFAULTS = {
  size: 24,
  strokeWidth: 1.5,
  accentColor: "#1FBED6",
};

function base(props: TokaniIconProps) {
  return {
    size: props.size ?? DEFAULTS.size,
    sw: props.strokeWidth ?? DEFAULTS.strokeWidth,
    ac: props.accentColor ?? DEFAULTS.accentColor,
  };
}

export function IconDashboard({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={sw} />
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth={sw} />
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth={sw} />
      <rect x="4.5" y="13" width="2" height="2.5" rx="0.4" fill={ac} />
      <rect x="7.5" y="10.5" width="2" height="4.5" rx="0.4" fill={ac} />
      <rect x="10.5" y="12" width="2" height="3" rx="0.4" fill={ac} />
      <polyline points="13.5,14 15,10 16.5,12 18.5,7.5" stroke="currentColor" strokeWidth={sw} fill="none" />
      <circle cx="18.5" cy="7.5" r="1" fill={ac} stroke="none" />
    </svg>
  );
}

export function IconTrips({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth={sw} />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth={sw} />
      <line x1="4" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth={sw} />
      <circle cx="8.5" cy="5.5" r="0.8" fill={ac} stroke="none" />
      <circle cx="12" cy="3.5" r="0.8" fill={ac} stroke="none" />
      <circle cx="15.5" cy="5.5" r="0.8" fill={ac} stroke="none" />
      <path d="M8.5 5.5 Q12 3 15.5 5.5" stroke={ac} strokeWidth={sw * 0.8} fill="none" strokeDasharray="1 1.2" />
    </svg>
  );
}

export function IconTravellers({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth={sw} />
      <path d="M2 21c0-4 3.5-7 8-7" stroke="currentColor" strokeWidth={sw} />
      <circle cx="17.5" cy="17.5" r="4" stroke={ac} strokeWidth={sw} />
      <line x1="17.5" y1="13.5" x2="17.5" y2="21.5" stroke={ac} strokeWidth={sw * 0.8} />
      <line x1="13.5" y1="17.5" x2="21.5" y2="17.5" stroke={ac} strokeWidth={sw * 0.8} />
      <ellipse cx="17.5" cy="17.5" rx="2.5" ry="4" stroke={ac} strokeWidth={sw * 0.8} />
    </svg>
  );
}

export function IconApprovals({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth={sw} />
      <line x1="8" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth={sw} />
      <line x1="8" y1="11.5" x2="13" y2="11.5" stroke="currentColor" strokeWidth={sw} />
      <line x1="8" y1="15" x2="11" y2="15" stroke="currentColor" strokeWidth={sw} />
      <circle cx="17.5" cy="16.5" r="4.5" stroke={ac} strokeWidth={sw} />
      <polyline points="15,16.5 17,18.5 20,14.5" stroke={ac} strokeWidth={sw} fill="none" />
    </svg>
  );
}

export function IconTravelPolicies({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2L4 6v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6L12 2z" stroke="currentColor" strokeWidth={sw} />
      <line x1="8.5" y1="10" x2="15.5" y2="10" stroke={ac} strokeWidth={sw} />
      <line x1="8.5" y1="13" x2="15.5" y2="13" stroke={ac} strokeWidth={sw} />
      <line x1="8.5" y1="16" x2="13" y2="16" stroke={ac} strokeWidth={sw} />
    </svg>
  );
}

export function IconFlights({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 16L13 10V4a2 2 0 0 0-4 0v6L1 16v2l8-2.5V20l-2 1.5V23l3-1 3 1v-1.5L11 20v-4.5L19 18l2-2z" stroke="currentColor" strokeWidth={sw} fill="none" />
      <line x1="3.5" y1="19.5" x2="6.5" y2="19.5" stroke={ac} strokeWidth={sw} />
      <line x1="17.5" y1="19.5" x2="20.5" y2="19.5" stroke={ac} strokeWidth={sw} />
    </svg>
  );
}

export function IconHotels({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="14" height="16" rx="1" stroke="currentColor" strokeWidth={sw} />
      <rect x="17" y="10" width="4" height="11" rx="1" stroke="currentColor" strokeWidth={sw} />
      <rect x="6" y="8" width="2.5" height="2.5" rx="0.4" stroke="currentColor" strokeWidth={sw * 0.8} />
      <rect x="10.5" y="8" width="2.5" height="2.5" rx="0.4" stroke="currentColor" strokeWidth={sw * 0.8} />
      <rect x="6" y="12.5" width="2.5" height="2.5" rx="0.4" stroke="currentColor" strokeWidth={sw * 0.8} />
      <rect x="10.5" y="12.5" width="2.5" height="2.5" rx="0.4" stroke="currentColor" strokeWidth={sw * 0.8} />
      <rect x="7.5" y="17" width="5" height="4" rx="0.5" fill={ac} stroke={ac} strokeWidth={sw * 0.5} />
      <line x1="10" y1="17" x2="10" y2="21" stroke="currentColor" strokeWidth={sw * 0.8} />
    </svg>
  );
}

export function IconExpense({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={sw} />
      <rect x="5" y="9" width="5" height="3.5" rx="1" fill={ac} stroke={ac} strokeWidth={sw * 0.3} />
      <line x1="5" y1="15.5" x2="10" y2="15.5" stroke="currentColor" strokeWidth={sw} />
      <line x1="13" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth={sw * 0.8} />
      <line x1="13" y1="12.5" x2="19" y2="12.5" stroke="currentColor" strokeWidth={sw * 0.8} />
      <line x1="13" y1="15.5" x2="16" y2="15.5" stroke="currentColor" strokeWidth={sw * 0.8} />
    </svg>
  );
}

export function IconTransport({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 17H3a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2h13l4 4v5a1 1 0 0 1-1 1h-2" stroke="currentColor" strokeWidth={sw} />
      <path d="M9 8h8l2 3H9V8z" stroke="currentColor" strokeWidth={sw * 0.8} fill="none" />
      <circle cx="7.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth={sw} />
      <circle cx="16.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth={sw} />
      <circle cx="7.5" cy="17.5" r="1" fill={ac} stroke="none" />
      <circle cx="16.5" cy="17.5" r="1" fill={ac} stroke="none" />
    </svg>
  );
}

export function IconDocuments({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="15" height="18" rx="2" stroke="currentColor" strokeWidth={sw} />
      <line x1="3" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth={sw} />
      <line x1="7" y1="3" x2="7" y2="8" stroke="currentColor" strokeWidth={sw} />
      <rect x="5.5" y="11" width="5" height="4" rx="0.5" stroke="currentColor" strokeWidth={sw * 0.8} />
      <circle cx="17" cy="17" r="4.5" stroke={ac} strokeWidth={sw} />
      <line x1="17" y1="12.5" x2="17" y2="21.5" stroke={ac} strokeWidth={sw * 0.7} />
      <line x1="12.5" y1="17" x2="21.5" y2="17" stroke={ac} strokeWidth={sw * 0.7} />
      <ellipse cx="17" cy="17" rx="2.8" ry="4.5" stroke={ac} strokeWidth={sw * 0.7} />
    </svg>
  );
}

export function IconAlerts({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth={sw} />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth={sw} />
      <circle cx="18" cy="5" r="3.5" fill={ac} stroke="white" strokeWidth={sw * 0.8} />
      <line x1="18" y1="3.5" x2="18" y2="5.5" stroke="white" strokeWidth={sw} />
      <circle cx="18" cy="6.5" r="0.6" fill="white" stroke="none" />
    </svg>
  );
}

export function IconReports({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth={sw} />
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth={sw} />
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth={sw} />
      <path d="M7 13.5 A4 4 0 0 1 7 5.5" stroke="currentColor" strokeWidth={sw} fill="none" />
      <path d="M7 5.5 A4 4 0 0 1 11 9.5 L7 9.5 Z" fill={ac} stroke={ac} strokeWidth={sw * 0.3} />
      <rect x="13" y="12" width="2" height="2" rx="0.3" fill={ac} />
      <rect x="15.5" y="9.5" width="2" height="4.5" rx="0.3" fill={ac} />
      <rect x="18" y="11" width="2" height="3" rx="0.3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function IconTeams({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth={sw} />
      <path d="M2 21c0-3.9 3.1-7 7-7" stroke="currentColor" strokeWidth={sw} />
      <circle cx="17" cy="8" r="2.5" stroke={ac} strokeWidth={sw} />
      <path d="M13 21c0-3.3 1.8-6 4-6s4 2.7 4 6" stroke={ac} strokeWidth={sw} />
    </svg>
  );
}

export function IconDutyOfCare({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2L4 6v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6L12 2z" stroke="currentColor" strokeWidth={sw} />
      <circle cx="12" cy="9" r="2.2" stroke={ac} strokeWidth={sw} />
      <path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={ac} strokeWidth={sw} />
    </svg>
  );
}

export function IconMessages({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth={sw} />
      <line x1="8" y1="9" x2="16" y2="9" stroke={ac} strokeWidth={sw} />
      <line x1="8" y1="13" x2="13" y2="13" stroke={ac} strokeWidth={sw} />
    </svg>
  );
}

export function IconCalendar({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth={sw} />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth={sw} />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth={sw} />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth={sw} />
      <rect x="7" y="13" width="2.5" height="2.5" rx="0.5" fill={ac} />
      <rect x="10.8" y="13" width="2.5" height="2.5" rx="0.5" fill={ac} opacity="0.6" />
      <rect x="14.5" y="13" width="2.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.2" />
      <rect x="7" y="17" width="2.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.2" />
      <rect x="10.8" y="17" width="2.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export function IconUpload({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth={sw} />
      <polyline points="17,8 12,3 7,8" stroke={ac} strokeWidth={sw} />
      <line x1="12" y1="3" x2="12" y2="15" stroke={ac} strokeWidth={sw} />
    </svg>
  );
}

export function IconSettings({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" stroke={ac} strokeWidth={sw} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth={sw} />
    </svg>
  );
}

export function IconSearch({ size, className, strokeWidth, accentColor }: TokaniIconProps) {
  const { size: s, sw, ac } = base({ size, strokeWidth, accentColor });
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10.5" cy="10.5" r="7" stroke="currentColor" strokeWidth={sw} />
      <line x1="15.8" y1="15.8" x2="21" y2="21" stroke="currentColor" strokeWidth={sw} />
      <circle cx="10.5" cy="10.5" r="3.5" stroke={ac} strokeWidth={sw * 0.8} />
    </svg>
  );
}

export const TOKANI_ICONS: Record<string, React.FC<TokaniIconProps>> = {
  dashboard: IconDashboard,
  trips: IconTrips,
  travellers: IconTravellers,
  approvals: IconApprovals,
  travelPolicies: IconTravelPolicies,
  flights: IconFlights,
  hotels: IconHotels,
  expense: IconExpense,
  transport: IconTransport,
  documents: IconDocuments,
  alerts: IconAlerts,
  reports: IconReports,
  teams: IconTeams,
  dutyOfCare: IconDutyOfCare,
  messages: IconMessages,
  calendar: IconCalendar,
  upload: IconUpload,
  settings: IconSettings,
  search: IconSearch,
};
