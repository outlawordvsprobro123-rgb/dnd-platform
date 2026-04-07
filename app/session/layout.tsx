// Сессия занимает весь экран — убираем padding от глобального плеера
export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ paddingBottom: 0 }}>{children}</div>
}
