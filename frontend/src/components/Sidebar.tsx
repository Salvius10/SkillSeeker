import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Bookmark, Newspaper, Trophy, User, Bell, Plus, CheckSquare, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface Props {
  unreadCount: number;
  pendingReviewCount: number;
}

const BadgeCount = ({ n }: { n: number }) =>
  n > 0 ? (
    <span style={{
      background: 'linear-gradient(135deg, #fe6e06, #ff8c38)',
      color: '#fff', fontSize: 10, fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginLeft: 'auto', boxShadow: '0 2px 6px rgba(254,110,6,0.4)', flexShrink: 0,
    }}>{n}</span>
  ) : null;

const SectionLabel = ({ label }: { label: string }) => (
  <div style={{
    padding: '20px 18px 7px', fontSize: 9.5, fontWeight: 700,
    letterSpacing: '0.13em', color: 'rgba(160,168,255,0.6)',
    textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
  }}>{label}</div>
);

function NavItem({ to, icon, label, badge, visible }: {
  to: string; icon: ReactNode; label: string; badge?: number; visible: boolean;
}) {
  if (!visible) return null;
  return (
    <NavLink
      to={to}
      aria-label={label}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textDecoration: 'none',
        border: isActive ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
        background: isActive
          ? 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)'
          : 'transparent',
        color: isActive ? '#fff' : 'rgba(255,255,255,0.58)',
        padding: '11px 13px', borderRadius: 10, fontSize: 13,
        fontWeight: isActive ? 700 : 500, fontFamily: "'Hanken Grotesk', sans-serif",
        cursor: 'pointer', transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: isActive ? '0 1px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
        backdropFilter: isActive ? 'blur(8px)' : 'none',
        letterSpacing: isActive ? '-0.1px' : '0',
      })}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.classList.contains('active')) { el.style.background = 'rgba(255,255,255,0.07)'; el.style.color = '#fff'; }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.classList.contains('active')) { el.style.background = 'transparent'; el.style.color = 'rgba(255,255,255,0.58)'; }
      }}
    >
      {({ isActive }) => (
        <>
          <span style={{ opacity: isActive ? 1 : 0.75, flexShrink: 0 }}>{icon}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
          {badge !== undefined && <BadgeCount n={badge} />}
          {isActive && (
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fe6e06', flexShrink: 0, boxShadow: '0 0 6px rgba(254,110,6,0.7)' }} />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ unreadCount, pendingReviewCount }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const emp = user?.role === 'employee';
  const initials = user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div style={{
      width: 272,
      background: 'linear-gradient(165deg, #08006e 0%, #1200a8 25%, #1a00d9 55%, #2014ee 80%, #2c1fff 100%)',
      display: 'flex', flexDirection: 'column', color: '#fff',
      overflow: 'hidden', flexShrink: 0, position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 240px 220px at 136px 70px, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 200, height: 200, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(254,110,6,0.07) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div style={{ padding: '26px 20px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #fe6e06 0%, #ff9640 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22, flexShrink: 0, boxShadow: '0 6px 20px rgba(254,110,6,0.5), inset 0 1px 0 rgba(255,255,255,0.25)', letterSpacing: '-1px' }}>S</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 17.5, lineHeight: 1.1, letterSpacing: '-0.7px', color: '#fff' }}>Skill Seeker</div>
          <div style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(170,178,255,0.6)', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>Challenge Hub</div>
        </div>
      </div>

      <SectionLabel label={emp ? 'Navigate' : 'Admin'} />

      <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '2px 10px', flex: 1, overflowY: 'auto' }}>
        <NavItem to="/challenges"    icon={<LayoutGrid size={16} />}   label="All Challenges"    visible={emp} />
        <NavItem to="/my-challenges" icon={<Bookmark size={16} />}     label="My Challenges"     visible={emp} />
        <NavItem to="/news"          icon={<Newspaper size={16} />}    label="News Feed"         visible={emp} />
        <NavItem to="/leaderboard"   icon={<Trophy size={16} />}       label="Leaderboard"       visible={emp} />
        <NavItem to="/profile"       icon={<User size={16} />}         label="My Profile"        visible={emp} />
        <NavItem to="/notifications" icon={<Bell size={16} />}         label="Notifications"     visible={emp} badge={unreadCount} />

        <NavItem to="/admin/challenges" icon={<LayoutGrid size={16} />}   label="All Challenges"    visible={!emp} />
        <NavItem to="/admin/create"     icon={<Plus size={16} />}         label="Create Challenge"  visible={!emp} />
        <NavItem to="/admin/review"     icon={<CheckSquare size={16} />}  label="Submission Review" visible={!emp} badge={pendingReviewCount} />
        <NavItem to="/admin/analytics"  icon={<BarChart2 size={16} />}    label="Analytics"         visible={!emp} />
        <NavItem to="/leaderboard"      icon={<Trophy size={16} />}       label="Leaderboard"       visible={!emp} />
        <NavItem to="/notifications"    icon={<Bell size={16} />}         label="Notifications"     visible={!emp} badge={unreadCount} />
      </nav>

      {/* User footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 11, position: 'relative' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)', border: '1.5px solid rgba(255,255,255,0.24)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#fff', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 10.5, color: 'rgba(180,185,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{user?.team || user?.role}</div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 7, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}
