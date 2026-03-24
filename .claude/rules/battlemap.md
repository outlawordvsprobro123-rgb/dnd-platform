---
glob: "**/components/battlemap/**"
---

# Правила модуля BattleMap

- Konva Stage — всегда динамический импорт с `ssr: false`
- Видео-карта — рисовать через `requestAnimationFrame` на Konva Image, НЕ HTML video напрямую
- Слои Konva (снизу вверх): background → grid → fog → tokens → ui-overlay
- Fog of war — тёмный прямоугольник + destination-out compositing для прозрачных зон
- Токены — круглые изображения через Konva.Circle clip + Konva.Image
- Drag-and-drop токенов — только разрешённые токены (мастер = все NPC, игрок = свой токен)
- Сетка — генерировать линии только в visible viewport (не рисовать за пределами экрана)
- requestAnimationFrame — всегда отменять через cancelAnimationFrame при unmount
- Размер карты — масштабировать под экран с сохранением пропорций
- Производительность — использовать `layer.batchDraw()` вместо множественных `layer.draw()`
