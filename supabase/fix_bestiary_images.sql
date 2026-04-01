-- Шаг 1: Проверить что в базе (запусти и посмотри список имён)
SELECT name, image_url IS NOT NULL as has_image FROM bestiary ORDER BY name;

-- Шаг 2: Обновить ВСЕ изображения одним запросом
-- Вставь ВСЁ ниже и запусти целиком

UPDATE bestiary SET image_url = CASE name
  WHEN 'Кобольд'                THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Kobold.webp'
  WHEN 'Бандит'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Bandit.webp'
  WHEN 'Стражник'               THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Guard.webp'
  WHEN 'Зомби чумы'             THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Zombie.webp'
  WHEN 'Жуткий коготь'          THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Crawling%20Claw.webp'
  WHEN 'Тролль'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Troll.webp'
  WHEN 'Хоббгоблин'             THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Hobgoblin.webp'
  WHEN 'Гуль'                   THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Ghoul.webp'
  WHEN 'Виверна'                THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Wyvern.webp'
  WHEN 'Медведь бурый'          THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Brown%20Bear.webp'
  WHEN 'Гигантский паук'        THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Giant%20Spider.webp'
  WHEN 'Мумия'                  THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Mummy.webp'
  WHEN 'Химера'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Chimera.webp'
  WHEN 'Медуза'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Medusa.webp'
  WHEN 'Циклоп'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Cyclops.webp'
  WHEN 'Огненный элементаль'    THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Fire%20Elemental.webp'
  WHEN 'Воздушный элементаль'   THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Air%20Elemental.webp'
  WHEN 'Вампир'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Vampire.webp'
  WHEN 'Дракон молодой красный' THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Young%20Red%20Dragon.webp'
  WHEN 'Личь'                   THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Lich.webp'
  WHEN 'Гигантский орёл'        THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Giant%20Eagle.webp'
  WHEN 'Мантикора'              THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Manticore.webp'
  WHEN 'Великан холмов'         THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Hill%20Giant.webp'
  WHEN 'Дракон молодой синий'   THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Young%20Blue%20Dragon.webp'
  WHEN 'Призрак'                THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Ghost.webp'
  WHEN 'Ум-пожиратель'          THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Mind%20Flayer.webp'
  WHEN 'Рух'                    THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Roc.webp'
  WHEN 'Дьявол рогатый'         THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Horned%20Devil.webp'
  WHEN 'Балор'                  THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Balor.webp'
  WHEN 'Тарраск'                THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Tarrasque.webp'
  WHEN 'Гоблин'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Goblin.webp'
  WHEN 'Скелет'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Skeleton.webp'
  WHEN 'Огр'                    THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Ogre.webp'
  WHEN 'Волк'                   THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Wolf.webp'
  WHEN 'Лютый волк'             THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Dire%20Wolf.webp'
  WHEN 'Оборотень'              THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Werewolf.webp'
  WHEN 'Вурдалак'               THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Wight.webp'
  WHEN 'Упырь'                  THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Ghast.webp'
  WHEN 'Кентавр'                THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Centaur.webp'
  WHEN 'Гарпия'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Harpy.webp'
  WHEN 'Минотавр'               THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Minotaur.webp'
  WHEN 'Грифон'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Griffon.webp'
  WHEN 'Наблюдатель'            THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Beholder.webp'
  WHEN 'Бехолдер'               THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Beholder.webp'
  WHEN 'Аболет'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Aboleth.webp'
  WHEN 'Тень'                   THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Shadow.webp'
  WHEN 'Бес'                    THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Imp.webp'
  WHEN 'Суккуб'                 THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Succubus.webp'
  WHEN 'Инкуб'                  THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Succubus.webp'
  WHEN 'Водный элементаль'      THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Water%20Elemental.webp'
  WHEN 'Земляной элементаль'    THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Earth%20Elemental.webp'
  WHEN 'Дракон молодой зелёный' THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Young%20Green%20Dragon.webp'
  WHEN 'Дракон молодой чёрный'  THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Young%20Black%20Dragon.webp'
  WHEN 'Дракон молодой белый'   THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Young%20White%20Dragon.webp'
  WHEN 'Крыса'                  THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Rat.webp'
  WHEN 'Рой крыс'               THEN 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/MM/Swarm%20of%20Rats.webp'
  ELSE image_url
END
WHERE is_homebrew = false;

-- Шаг 3: Проверить результат
SELECT name, image_url FROM bestiary WHERE is_homebrew = false ORDER BY name;
