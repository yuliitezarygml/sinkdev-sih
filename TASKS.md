# План задач и дорожная карта проекта (TASKS.md)

Проект: **SinkDev Authenticator (Steam Guard + 2FA Mobile App)**  
Стек: **Tauri 2 + Next.js 16 (App Router, Static Export) + Rust + Tailwind CSS v4**  
Целевая платформа: **Android (первый приоритет), Desktop/iOS (будущее)**  

---

## 📌 Текущий статус проекта (MVP готов)

- [x] **Каркас приложения**: Next.js 16 + React 19 + Tailwind v4 с `output: "export"`.
- [x] **Нативная оболочка Tauri 2**: Интеграция с Android toolchain (NDK 28, OpenJDK 21).
- [x] **Генерация Steam Guard**: Алгоритм Valve Base26, 5 символов, 30-секундный круговой таймер.
- [x] **Генерация 2FA TOTP**: RFC 6238, поддержка SHA-1, SHA-256, SHA-512, 6/8 цифр, периодов 30/60 сек.
- [x] **Импорт Steam maFile**: Поддержка файлов Steam Desktop Authenticator (SDA) + ручной ввод.
- [x] **Подтверждения трейдов Steam (SIH style)**: Просмотр и одобрение обменов/лотов ТП с авто-продлением OAuth через `RefreshToken`.
- [x] **Архитектура Safe DTO**: Секреты хранятся только в Rust vault; Next.js получает безопасные DTO без ключей.
- [x] **App Lock и безопасность**:
  - Мастер-PIN с SHA-256 солением.
  - Экран блокировки с виртуальной клавиатурой.
  - Автоблокировка по тайм-ауту бездействия и при уходе в фон (`visibilitychange`).
  - Автоочистка буфера обмена после копирования.
  - Проверка синхронизации системного времени со Steam серверами (`QueryTime/v1`).
- [x] **Харденинг Android**:
  - `FLAG_SECURE` в `MainActivity.kt` (блокировка скриншотов, записи и превью в недавних приложениях).
  - `android:allowBackup="false"` в `AndroidManifest.xml`.
  - Переход на pure-Rust TLS (`rustls`) в `reqwest` для исключения C OpenSSL зависимостей.
- [x] **Сборка APK**: Успешно скомпилирован универсальный отладочный APK (`app-universal-debug.apk`).

---

## 🚀 Бэклог задач и дорожная карта (Roadmap)

### 🎨 ЭТАП 1: Визуальные улучшения и удобство (UI/UX) — ЗАВЕРШЕНО
- [x] **1.1. Автоматические иконки сервисов для 2FA**:
  - Определение бренда по полю `issuer` и `label` (Google, Discord, GitHub, Binance, Telegram, Valve, Epic Games, VK, Twitch, Blizzard, Microsoft, Reddit).
  - Цветные векторные логотипы на карточках (`src/lib/brands.ts`, `BrandIcon.tsx`).
  - Покрыто автотестами `tests/frontend.test.mjs`.
- [x] **1.2. Режим скрытия кодов (Privacy / Streamer Mode)**:
  - Опция в настройках и глобальный провайдер `AppPreferencesProvider.tsx`.
  - Коды маскируются символами `••••••`, раскрытие по тапу на 5 секунд.
- [x] **1.3. Локализация (Мультиязычность RU / EN)**:
  - Полный словарь переводов `src/lib/i18n.ts` для всех вкладок, настроек, модалок и бэкапов.
  - Покрыто автотестами синхронизации ключей в `tests/frontend.test.mjs`.
- [x] **1.4. Тактильный отклик (Haptic Feedback)**:
  - Тактильная вибрация `src/lib/haptics.ts` при копировании кода, вводе PIN и подтверждении/отклонении обменов.
- [x] **1.5. AMOLED True Black тема**:
  - Переключатель тем в настройках: «Steam Dark» (`#1b2838`) и «AMOLED Black» (`#000000`) для экономии заряда батареи.

---

### 💾 ЭТАП 2: Резервное копирование и управление данными — ЗАВЕРШЕНО
- [x] **2.1. Зашифрованный бэкап хранилища (Encrypted Backup)**:
  - Экспорт и импорт единого зашифрованного файла (`.sinkvault` / AES-256-GCM + PBKDF2) в `src-tauri/src/storage/backup.rs`.
  - Защита паролем, проверка целостности и предотвращение повреждения данных.
  - Покрыто unit-тестами roundtrip, wrong password, corrupted ciphertext в `cargo test`.
- [x] **2.2. Массовый импорт нескольких `.maFile` (Batch Import)**:
  - Выбор сразу нескольких файлов `.maFile` через input `multiple` и drag-and-drop в `ImportMaFileModal.tsx`.
  - Команда Rust `import_batch_mafiles` со списком результатов и ошибок.
- [x] **2.3. Импорт из сторонних аутентификаторов**:
  - Декодер Google Authenticator protobuf migration (`otpauth-migration://offline?data=...`) в `src-tauri/src/crypto/migration.rs`.
  - Покрыто unit-тестами в Rust (`cargo test`).

---

### 🛡️ ЭТАП 3: Продвинутые функции Steam Guard (SIH Mobile / SDA уровень)
- [x] **3.1. Детальный осмотр обменов (Trade Offer Item Inspection)**:
  - Запрос деталей подтверждения `/mobileconf/details/{conf_id}` в `src-tauri/src/steam/confirmations.rs`.
  - Просмотр предметов обмена (иконки, названия, HTML-превью) в `SteamConfirmationsModal.tsx`.
- [ ] **3.2. Авто-подтверждение лотов и обменов (Auto-Confirm)**:
  - Автоматическое подтверждение выставления предметов на Торговую площадку (по расписанию/в фоне).
  - Белый список Steam ID для автоматического принятия входящих трейдов.
- [ ] **3.3. Вход в Steam по QR-коду (Steam QR Login Scanner)**:
  - Сканирование QR-кода на странице входа Steam через камеру для мгновенной авторизации.
- [x] **3.4. Индикатор статуса Steam-сессии**:
  - Статус сессии на карточке аккаунта (Зелёный = Сессия активна, Жёлтый = Требуется обновить токен, Серый = Сессия не найдена) в `SteamCodeCard.tsx`.
  - Обновление сессии через `update_steam_session`.

---

### 📱 ЭТАП 4: Системная интеграция Android
- [x] **4.1. Системная биометрия (Fingerprint / Face Unlock)**:
  - Интеграция `tauri-plugin-biometric` и fallback-проверка в `src-tauri/src/commands/security.rs` (`unlock_vault_biometric`).
  - Кнопка биометрической разблокировки и тактильный отклик в `AppLockProvider.tsx`.
- [ ] **4.2. Фоновый сервис и Push-уведомления**:
  - Фоновый воркер (Android WorkManager) для периодической проверки подтверждений Steam.
  - Системное уведомление при появлении нового входящего обмена.
- [ ] **4.3. Виджет главного экрана (App Widget)**:
  - Быстрый просмотр кодов выбранного Steam-аккаунта или часто используемого 2FA прямо на рабочем столе Android.
- [ ] **4.4. Категории, папки и Drag & Drop сортировка**:
  - Группировка 2FA и Steam аккаунтов по тегам.
  - Ручное перетаскивание карточек для настройки порядка отображения.

---

## 🛠️ Технический долг и оптимизация
- [x] **Минимизация размера Release APK**:
  - Настроен `[profile.release]` в `src-tauri/Cargo.toml` (`opt-level = "z"`, `lto = true`, `codegen-units = 1`, `strip = true`, `panic = "abort"`).
  - Pure-Rust TLS (`rustls`) для исключения нативных C OpenSSL библиотек.
- [ ] **Release Keystore**:
  - Генерация ключа подписи релизных сборок (release keystore) для публикации или прямой установки без предупреждений Google Play Protect.
