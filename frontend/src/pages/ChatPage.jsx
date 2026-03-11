import Chat from '../components/ui/Chat';

export default function ChatPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, minHeight: 0,
    }}>
      <div className="page-header" style={{ flexShrink: 0, paddingBottom: 12 }}>
        <h1 className="page-title">LEAGUE CHAT</h1>
        <div className="page-subtitle">TRASH TALK · STRATEGY · GAME DAY BANTER</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Chat />
      </div>
    </div>
  );
}
