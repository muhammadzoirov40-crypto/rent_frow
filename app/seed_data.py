import asyncio
import uuid
import random
from datetime import datetime, date, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, async_session_factory, Base
from app.core.enums import UserRole, ListingStatus, PriceUnit, RentalRequestStatus
from app.models import *  # noqa
from app.models.user import User
from app.models.city import City
from app.models.district import District
from app.models.category import Category
from app.models.subcategory import SubCategory
from app.models.listing import Listing
from app.models.listing_image import ListingImage
from app.models.favorite import Favorite
from app.models.rental_request import RentalRequest
from app.models.review import Review

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
    import hashlib
    pwd_context = None

DEFAULT_PASSWORD = "password123"


def hash_password(password: str) -> str:
    if pwd_context:
        return pwd_context.hash(password)
    return hashlib.sha256(password.encode()).hexdigest()


CITIES_DATA = [
    ("Душанбе", "Душанбе"),
    ("Хуҷанд", "Хуҷанд"),
    ("Бохтар", "Бохтар"),
    ("Кӯлоб", "Кӯлоб"),
    ("Ваҳдат", "Ваҳдат"),
    ("Турсунзода", "Турсунзода"),
    ("Истаравшан", "Истаравшан"),
    ("Конибодом", "Конибодом"),
    ("Панҷакент", "Панҷакент"),
    ("Қурғонтеппа", "Қурғонтеппа"),
]

DISTRICTS_DATA = {
    "Душанбе": ["Сино", "Фирӯзобод", "Шоҳмансур", "Исмоили Сомонӣ", "Рӯдакӣ"],
    "Хуҷанд": ["Markazi", "Сомониён", "Қирғизобод"],
}

CATEGORIES_DATA = [
    {
        "name": "Недвижимость",
        "name_tj": "Идоракунии амвол",
        "icon": "home",
        "subcategories": ["Квартиры", "Дома", "Комнаты", "Офисы", "Помещения", "Дачи", "Гаражи"],
    },
    {
        "name": "Транспорт",
        "name_tj": "Нақлиёт",
        "icon": "car",
        "subcategories": ["Автомобили", "Мотоциклы", "Велосипеды", "Самокаты", "Спецтехника"],
    },
    {
        "name": "Электроника",
        "name_tj": "Электроника",
        "icon": "laptop",
        "subcategories": ["Ноутбуки", "Телефоны", "Камеры", "Проекторы", "Игровые устройства"],
    },
    {
        "name": "Для мероприятий",
        "name_tj": "Барои чорабиниҳо",
        "icon": "calendar",
        "subcategories": ["Колонки", "Микрофоны", "Свет", "Столы", "Стулья", "Декорации"],
    },
    {
        "name": "Одежда",
        "name_tj": "Либос",
        "icon": "shirt",
        "subcategories": ["Платья", "Костюмы", "Национальная одежда", "Обувь"],
    },
    {
        "name": "Инструменты",
        "name_tj": "Асбобҳо",
        "icon": "wrench",
        "subcategories": ["Дрели", "Перфораторы", "Генераторы", "Строительное оборудование"],
    },
    {
        "name": "Спорт",
        "name_tj": "Варзиш",
        "icon": "dumbbell",
        "subcategories": ["Велосипеды", "Лыжи", "Тренажеры", "Спортивный инвентарь"],
    },
    {
        "name": "Другое",
        "name_tj": "Дигар",
        "icon": "ellipsis",
        "subcategories": [],
    },
]

USERS_DATA = [
    {
        "email": "admin@rentflow.tj",
        "phone": "+992900000001",
        "display_name": "Администратор",
        "role": UserRole.ADMIN,
        "is_verified": True,
    },
    {
        "email": "muhammadzoirov40@gmail.com",
        "phone": "+992900000002",
        "display_name": "Muhammad Zoirov",
        "role": UserRole.ADMIN,
        "is_verified": True,
    },
    {
        "email": "akmal@rentflow.tj",
        "phone": "+992900123456",
        "display_name": "Акмал Рустамов",
        "role": UserRole.OWNER,
        "is_verified": True,
    },
    {
        "email": "daler@rentflow.tj",
        "phone": "+992900234567",
        "display_name": "Далер Каримов",
        "role": UserRole.OWNER,
        "is_verified": True,
    },
    {
        "email": "firuza@rentflow.tj",
        "phone": "+992900345678",
        "display_name": "Фируза Мамадова",
        "role": UserRole.OWNER,
        "is_verified": True,
    },
    {
        "email": "zebo@rentflow.tj",
        "phone": "+992900456789",
        "display_name": "Зебо Назарова",
        "role": UserRole.CUSTOMER,
        "is_verified": True,
    },
    {
        "email": "rustam@rentflow.tj",
        "phone": "+992900567890",
        "display_name": "Рустам Давлатов",
        "role": UserRole.CUSTOMER,
        "is_verified": True,
    },
    {
        "email": "malika@rentflow.tj",
        "phone": "+992900678901",
        "display_name": "Малика Саидова",
        "role": UserRole.CUSTOMER,
        "is_verified": True,
    },
    {
        "email": "bahrom@rentflow.tj",
        "phone": "+992900789012",
        "display_name": "Бахром Ибрагимов",
        "role": UserRole.OWNER,
        "is_verified": True,
    },
    {
        "email": "nilufar@rentflow.tj",
        "phone": "+992900890123",
        "display_name": "Нилуфар Холматова",
        "role": UserRole.CUSTOMER,
        "is_verified": False,
    },
]

LISTINGS_DATA = [
    # Недвижимость - Квартиры
    {
        "title": "Квартира 2-комнатная в центре Душанбе",
        "description": "Уютная двухкомнатная квартира в центре Душанбе. Ремонт евроремонт, мебель modern, вся техника. Рядом парк, магазины, остановка транспорта.",
        "price": 350,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1000,
        "city": "Душанбе",
        "district": "Шоҳмансур",
        "category": "Недвижимость",
        "subcategory": "Квартиры",
        "address": "ул. Рудаки 45, кв. 12",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 234,
        "is_verified": True,
    },
    {
        "title": "Студия на Арбобе",
        "description": "Современная студия с панорамными окнами. Кондиционер, стиральная машина, посудомоечная машина. Идеально для пары или одинокого путешественника.",
        "price": 250,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 750,
        "city": "Душанбе",
        "district": "Исмоили Сомонӣ",
        "category": "Недвижимость",
        "subcategory": "Квартиры",
        "address": "проспект Исмоили Сомони 78",
        "owner_email": "daler@rentflow.tj",
        "views_count": 189,
        "is_verified": True,
    },
    {
        "title": "Квартира 3-комнатная Хуҷанд",
        "description": "Просторная трёхкомнатная квартира в центре Хуҷанда. Свежий ремонт, просторная кухня, два балкона. Тихий двор, парковка.",
        "price": 280,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 840,
        "city": "Хуҷанд",
        "district": "Markazi",
        "category": "Недвижимость",
        "subcategory": "Квартиры",
        "address": "ул. Ленина 112",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 156,
        "is_verified": True,
    },
    # Недвижимость - Дома
    {
        "title": "Дом с участком в Ваҳдате",
        "description": "Просторный дом 300 м² на участке 10 соток. Гараж на 2 машины, баня, барбекю зона. Подходит для семейного отдыха.",
        "price": 800,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Ваҳдат",
        "district": None,
        "category": "Недвижимость",
        "subcategory": "Дома",
        "address": "микрорайон 5, ул. Мира 8",
        "owner_email": "bahrom@rentflow.tj",
        "views_count": 98,
        "is_verified": True,
    },
    # Недвижимость - Офисы
    {
        "title": "Офис в бизнес-центре",
        "description": "Офисное помещение 50 м² в современном бизнес-центре. Кондиционер, интернет, охрана, парковка. Рядом метро.",
        "price": 400,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1200,
        "city": "Душанбе",
        "district": "Сино",
        "category": "Недвижимость",
        "subcategory": "Офисы",
        "address": "ул. Сафар Абдулло 15",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 120,
        "is_verified": True,
    },
    # Транспорт - Автомобили
    {
        "title": "Toyota Camry 2023",
        "description": "Тойота Камри 2023 года выпуска. Атмосферный двигатель 2.5, автомат. Кондиционер, кожаный салон, камера заднего вида.",
        "price": 350,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 5000,
        "city": "Душанбе",
        "district": "Фирӯзобод",
        "category": "Транспорт",
        "subcategory": "Автомобили",
        "address": "ул. Б.Ғафуров 88",
        "owner_email": "daler@rentflow.tj",
        "views_count": 567,
        "is_verified": True,
    },
    {
        "title": "Hyundai Tucson 2024",
        "description": "Хундай Туксон 2024, полный привод. Навигация, подогрев сидений, камеры 360°. Идеален для путешествий по горам.",
        "price": 450,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 7000,
        "city": "Душанбе",
        "district": "Исмоили Сомонӣ",
        "category": "Транспорт",
        "subcategory": "Автомобили",
        "address": "проспект Айни 42",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 432,
        "is_verified": True,
    },
    {
        "title": "Chevrolet Malibu 2022",
        "description": "Шевроле Малибу, турбо 1.5, автомат. Кондиционер, мультимедиа, подогрев.",
        "price": 250,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 4000,
        "city": "Хуҷанд",
        "district": "Сомониён",
        "category": "Транспорт",
        "subcategory": "Автомобили",
        "address": "ул. Сомониён 23",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 289,
        "is_verified": True,
    },
    {
        "title": "Honda CR-V 2023",
        "description": "Хонда СР-В, полный привод, бензин. Кожаный салон, панорамная крыша, JBL аудио.",
        "price": 400,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 6000,
        "city": "Душанбе",
        "district": "Рӯдакӣ",
        "category": "Транспорт",
        "subcategory": "Автомобили",
        "address": "РРП Рӯдаки, кв. 3",
        "owner_email": "bahrom@rentflow.tj",
        "views_count": 345,
        "is_verified": True,
    },
    # Транспорт - Мотоциклы
    {
        "title": "Honda CB500F",
        "description": "Мотоцикл Honda CB500f, 471 куб. см. Идеальное состояние, сервисная книжка. Шлем в комплекте.",
        "price": 200,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Душанбе",
        "district": "Сино",
        "category": "Транспорт",
        "subcategory": "Мотоциклы",
        "address": "ул. Миклухо-Маклая 10",
        "owner_email": "daler@rentflow.tj",
        "views_count": 178,
        "is_verified": True,
    },
    # Электроника - Ноутбуки
    {
        "title": "MacBook Pro M3 14",
        "description": "MacBook Pro M3 14 дюймов, 18 ГБ RAM, 512 SSD. Идеален для работы, видеомонтажа, дизайна.",
        "price": 200,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 5000,
        "city": "Душанбе",
        "district": "Шоҳмансур",
        "category": "Электроника",
        "subcategory": "Ноутбуки",
        "address": "ул. Айни 15",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 312,
        "is_verified": True,
    },
    {
        "title": "Lenovo ThinkPad X1 Carbon",
        "description": "Lenovo ThinkPad X1 Carbon Gen 11, i7, 16GB RAM, 512 SSD. Бизнес-класс, лёгкий и мощный.",
        "price": 150,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 4000,
        "city": "Душанбе",
        "district": "Исмоили Сомонӣ",
        "category": "Электроника",
        "subcategory": "Ноутбуки",
        "address": "ул. Сафар Абдулло 5",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 198,
        "is_verified": True,
    },
    {
        "title": "ASUS ROG Strix G16",
        "description": "Игровой ноутбук ASUS ROG Strix G16, RTX 4070, i9, 32GB RAM. Подходит для игр и стриминга.",
        "price": 250,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 6000,
        "city": "Хуҷанд",
        "district": "Markazi",
        "category": "Электроника",
        "subcategory": "Ноутбуки",
        "address": "ул. Ленина 56",
        "owner_email": "daler@rentflow.tj",
        "views_count": 267,
        "is_verified": True,
    },
    # Электроника - Камеры
    {
        "title": "Sony A7IV с объективом",
        "description": "Камера Sony A7IV + Sony 24-70mm f/2.8 GM. Полный кадр, 4K видео. Идеален для свадеб и мероприятий.",
        "price": 350,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 8000,
        "city": "Душанбе",
        "district": "Шоҳмансур",
        "category": "Электроника",
        "subcategory": "Камеры",
        "address": "ул. Рудаки 90",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 445,
        "is_verified": True,
    },
    {
        "title": "Canon EOS R6 Mark II",
        "description": "Canon EOS R6 II, 24MP, 40fps серийная съёмка, 4K 60fps. Включён объектив RF 50mm f/1.8.",
        "price": 300,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 7000,
        "city": "Душанбе",
        "district": "Фирӯзобод",
        "category": "Электроника",
        "subcategory": "Камеры",
        "address": "ул. Б.Ғафуров 120",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 321,
        "is_verified": True,
    },
    # Электроника - Проекторы
    {
        "title": "Epson EH-TW6100 4K",
        "description": "Проектор Epson 4K, 3000 ANSI люмен. Подходит для домашнего кинотеатра и презентаций.",
        "price": 180,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Душанбе",
        "district": "Сино",
        "category": "Электроника",
        "subcategory": "Проекторы",
        "address": "ул. Миклухо-Маклая 32",
        "owner_email": "daler@rentflow.tj",
        "views_count": 156,
        "is_verified": True,
    },
    # Для мероприятий - Колонки
    {
        "title": "JBL PartyBox 710",
        "description": "Мощная колонка JBL PartyBox 710, 800 Вт. Подсветка, караоке, Bluetooth. Для вечеринок до 100 человек.",
        "price": 250,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 4000,
        "city": "Душанбе",
        "district": "Шоҳмансур",
        "category": "Для мероприятий",
        "subcategory": "Колонки",
        "address": "ул. Айни 28",
        "owner_email": "bahrom@rentflow.tj",
        "views_count": 289,
        "is_verified": True,
    },
    {
        "title": "JBL Eon One MK2",
        "description": "Профессиональная акустика JBL Eon One MK2. Линейный массив, 1100 Вт. Для концертов и мероприятий.",
        "price": 350,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 5000,
        "city": "Душанбе",
        "district": "Исмоили Сомонӣ",
        "category": "Для мероприятий",
        "subcategory": "Колонки",
        "address": "ул. Сафар Абдулло 10",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 198,
        "is_verified": True,
    },
    # Для мероприятий - Микрофоны
    {
        "title": "Shure SM58 + WL185 комплект",
        "description": "Комплект из 2 беспроводных микрофонов Shure. Идеален для караоке, выступлений, презентаций.",
        "price": 100,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1500,
        "city": "Хуҷанд",
        "district": "Markazi",
        "category": "Для мероприятий",
        "subcategory": "Микрофоны",
        "address": "пл. Ленина 5",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 134,
        "is_verified": True,
    },
    # Для мероприятий - Свет
    {
        "title": "Стойки света + Прожекторы (4 шт)",
        "description": "Набор из 4 LED прожекторов на стойках. RGB подсветка, DMX управление. Для сцены и мероприятий.",
        "price": 200,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Душанбе",
        "district": "Рӯдакӣ",
        "category": "Для мероприятий",
        "subcategory": "Свет",
        "address": "РРП Рӯдаки",
        "owner_email": "daler@rentflow.tj",
        "views_count": 167,
        "is_verified": True,
    },
    # Для мероприятий - Столы
    {
        "title": "Банкетные столы (10 шт)",
        "description": "10 банкетных столов 180×75 см. Складные, прочные. Для банкетов, свадеб, корпоративов.",
        "price": 150,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 2000,
        "city": "Душанбе",
        "district": "Сино",
        "category": "Для мероприятий",
        "subcategory": "Столы",
        "address": "ул. Миклухо-Маклая 50",
        "owner_email": "bahrom@rentflow.tj",
        "views_count": 112,
        "is_verified": True,
    },
    # Одежда - Платья
    {
        "title": "Вечернее платье для свадьбы",
        "description": "Элегантное вечернее платье размер 46-48. Кристаллы Swarovski, шёлк. Идеально для свадьбы или банкета.",
        "price": 150,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 2000,
        "city": "Душанбе",
        "district": "Шоҳмансур",
        "category": "Одежда",
        "subcategory": "Платья",
        "address": "ТЦ «Менора»",
        "owner_email": "malika@rentflow.tj" if False else "firuza@rentflow.tj",
        "views_count": 234,
        "is_verified": True,
    },
    # Одежда - Костюмы
    {
        "title": "Мужской деловой костюм",
        "description": "Классический мужской костюм TOM TAILOR, размер 50. Включает пиджак и брюки. Для деловых встреч и мероприятий.",
        "price": 120,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1500,
        "city": "Душанбе",
        "district": "Исмоили Сомонӣ",
        "category": "Одежда",
        "subcategory": "Костюмы",
        "address": "ТЦ «Сомон Плаза»",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 178,
        "is_verified": True,
    },
    # Одежда - Национальная одежда
    {
        "title": "Национальный костюм таджикский",
        "description": "Традиционный таджикский костюм для мужчин. Курта, шаровар, бельт. Ручная вышивка, натуральные ткани.",
        "price": 100,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1000,
        "city": "Панҷакент",
        "district": None,
        "category": "Одежда",
        "subcategory": "Национальная одежда",
        "address": "базар Панҷакент",
        "owner_email": "daler@rentflow.tj",
        "views_count": 89,
        "is_verified": True,
    },
    # Инструменты - Дрели
    {
        "title": "Bosch GBH 2-28 Перфоратор",
        "description": "Профессиональный перфоратор Bosch GBH 2-28, 800 Вт. SDS-plus, 3 режима. С.Depth stop и кейсом.",
        "price": 80,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1000,
        "city": "Душанбе",
        "district": "Фирӯзобод",
        "category": "Инструменты",
        "subcategory": "Перфораторы",
        "address": "стритмаркет «Мегастрой»",
        "owner_email": "bahrom@rentflow.tj",
        "views_count": 145,
        "is_verified": True,
    },
    {
        "title": "Makita DHP486 Дрель-шуруповёрт",
        "description": "Аккумуляторная дрель-шуруповёрт Makita 18V. 2 аккумулятора, быстрая зарядка, кейс.",
        "price": 60,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 800,
        "city": "Хуҷанд",
        "district": "Сомониён",
        "category": "Инструменты",
        "subcategory": "Дрели",
        "address": "ул. Сомониён 15",
        "owner_email": "daler@rentflow.tj",
        "views_count": 112,
        "is_verified": True,
    },
    # Инструменты - Генераторы
    {
        "title": "Honda EU30i Инверторный генератор",
        "description": "Тихий инверторный генератор Honda EU30i, 2.8 кВт. Для стройки, кемпинга, как резервный источник.",
        "price": 200,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Кӯлоб",
        "district": None,
        "category": "Инструменты",
        "subcategory": "Генераторы",
        "address": "ул. Ленина 45",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 98,
        "is_verified": True,
    },
    # Инструменты - Строительное оборудование
    {
        "title": "Бетономешалка 350 л",
        "description": "Электрическая бетономешалка на 350 литров. Мощность 1.5 кВт, для строительных работ.",
        "price": 120,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1500,
        "city": "Турсунзода",
        "district": None,
        "category": "Инструменты",
        "subcategory": "Строительное оборудование",
        "address": "ул. Хуҷандская 12",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 76,
        "is_verified": True,
    },
    # Спорт - Велосипеды
    {
        "title": "Горный велосипед Trek Marlin 7",
        "description": "Горный велосипед Trek Marlin 7, 29 колёса, 21 скорость. Идеален для горных троп Таджикистана.",
        "price": 100,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 2000,
        "city": "Душанбе",
        "district": "Рӯдакӣ",
        "category": "Спорт",
        "subcategory": "Велосипеды",
        "address": "РРП Рӯдаки, ул. Ленина 7",
        "owner_email": "daler@rentflow.tj",
        "views_count": 234,
        "is_verified": True,
    },
    {
        "title": "Электросамокат Xiaomi Pro 2",
        "description": "Электросамокат Xiaomi Mi Electric Scooter Pro 2. Запас хода 45 км, максимальная скорость 25 км/ч.",
        "price": 80,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1500,
        "city": "Душанбе",
        "district": "Шоҳмансур",
        "category": "Спорт",
        "subcategory": "Спортивный инвентарь",
        "address": "ул. Рудаки 120",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 312,
        "is_verified": True,
    },
    # Спорт - Тренажеры
    {
        "title": "Беговая дорожка Horizon Fitness",
        "description": "Беговая дорожка Horizon Fitness, максимальная скорость 20 км/ч, уклон 12%. Складная.",
        "price": 150,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Душанбе",
        "district": "Исмоили Сомонӣ",
        "category": "Спорт",
        "subcategory": "Тренажеры",
        "address": "ул. Сафар Абдулло 22",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 145,
        "is_verified": True,
    },
    # Спорт - Лыжи
    {
        "title": "Горные лыжи Salomon + ботинки",
        "description": "Горные лыжи Salomon 170 см + ботинки размер 42. Для начинающих и среднего уровня.",
        "price": 200,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Душанбе",
        "district": "Рӯдакӣ",
        "category": "Спорт",
        "subcategory": "Лыжи",
        "address": "РРП Рӯдаки",
        "owner_email": "bahrom@rentflow.tj",
        "views_count": 67,
        "is_verified": True,
    },
    # Другое
    {
        "title": "Генератор Honda 2.5 кВт",
        "description": "Бензиновый генератор Honda EU22i, тихий, экономичный. Для стройки или как резервный источник.",
        "price": 120,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 2000,
        "city": "Истаравшан",
        "district": None,
        "category": "Другое",
        "subcategory": None,
        "address": "центральный базар",
        "owner_email": "daler@rentflow.tj",
        "views_count": 56,
        "is_verified": True,
    },
    # More listings to hit 30+
    {
        "title": "DJI Mini 4 Pro Дрон",
        "description": "Квадрокоптер DJI Mini 4 Pro, 4K HDR видео, время полёта 34 мин. Вес менее 250 г, регистрация не нужна.",
        "price": 200,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 4000,
        "city": "Душанбе",
        "district": "Шоҳмансур",
        "category": "Электроника",
        "subcategory": "Камеры",
        "address": "ул. Рудаки 70",
        "owner_email": "akmal@rentflow.tj",
        "views_count": 389,
        "is_verified": True,
    },
    {
        "title": "Проектор BenQ TH685i",
        "description": "Проектор BenQ TH685i, 1080p, 3500 люмен,输入延迟 8.3ms. Идеален для игр и фильмов.",
        "price": 150,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 2500,
        "city": "Хуҷанд",
        "district": "Markazi",
        "category": "Электроника",
        "subcategory": "Проекторы",
        "address": "ул. Ленина 88",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 134,
        "is_verified": True,
    },
    {
        "title": "PlayStation 5 + 2 геймпада",
        "description": "Sony PlayStation 5 Slim + 2 DualSense геймпада. 3 игры в комплекте: Spider-Man 2, God of War, Horizon.",
        "price": 150,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 3000,
        "city": "Душанбе",
        "district": "Сино",
        "category": "Электроника",
        "subcategory": "Игровые устройства",
        "address": "ул. Миклухо-Маклая 18",
        "owner_email": "daler@rentflow.tj",
        "views_count": 445,
        "is_verified": True,
    },
    {
        "title": "Звуковая система для дискотеки",
        "description": "Полная звуковая система: 2 колонки QSC K12.2, 1 сабвуфер QSC KS118, микшер Yamaha MG16. Звукоинженер по запросу.",
        "price": 500,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 8000,
        "city": "Душанбе",
        "district": "Исмоили Сомонӣ",
        "category": "Для мероприятий",
        "subcategory": "Колонки",
        "address": "ул. Сафар Абдулло 30",
        "owner_email": "bahrom@rentflow.tj",
        "views_count": 178,
        "is_verified": True,
    },
    {
        "title": "Стулья для мероприятия (20 шт)",
        "description": "20 белых банкетных стульев с чехлами. Подходят для свадеб, банкетов, церемоний.",
        "price": 100,
        "price_unit": PriceUnit.PER_DAY,
        "deposit": 1500,
        "city": "Кӯлоб",
        "district": None,
        "category": "Для мероприятий",
        "subcategory": "Стулья",
        "address": "ул. Ленина 20",
        "owner_email": "firuza@rentflow.tj",
        "views_count": 89,
        "is_verified": True,
    },
]

REVIEWS_DATA = [
    {"rating": 5, "comment": "Отличная квартира, очень чисто и уютно. Рекомендую!"},
    {"rating": 4, "comment": "Хороший автомобиль, но немного шумный."},
    {"rating": 5, "comment": "Камера в идеальном состоянии, отличное качество съёмки."},
    {"rating": 4, "comment": "Колонка мощная, звук потрясающий. Доставка вовремя."},
    {"rating": 5, "comment": "Ноутбук быстрый, удобный для работы. Всё понравилось."},
    {"rating": 3, "comment": "Нормально, но можно лучше. Небольшие царапины на корпусе."},
    {"rating": 5, "comment": "Лучший сервис в Душанбе! Всё на высшем уровне."},
    {"rating": 4, "comment": "Велосипед хороший, но каска не была в комплекте."},
    {"rating": 5, "comment": "Генератор тихий и надёжный. Работает без проблем."},
    {"rating": 4, "comment": "Перфоратор мощный, справился с бетоном. Рекомендую."},
]

RENTAL_REQUESTS_DATA = [
    {
        "message": "Здравствуйте! Хочу арендовать квартиру на выходные.",
        "status": RentalRequestStatus.PENDING,
        "days": 2,
    },
    {
        "message": "Интересует аренда автомобиля на неделю. Нужен для поездки в Хуҷанд.",
        "status": RentalRequestStatus.ACCEPTED,
        "days": 7,
    },
    {
        "message": "Нужна камера на свадьбу 15 числа.",
        "status": RentalRequestStatus.COMPLETED,
        "days": 1,
    },
    {
        "message": "Арендую ноутбук на 3 дня для презентации.",
        "status": RentalRequestStatus.REJECTED,
        "days": 3,
    },
    {
        "message": "Хочу взять колонку на день рождения.",
        "status": RentalRequestStatus.PENDING,
        "days": 1,
    },
    {
        "message": "Нужен генератор на стройку на 5 дней.",
        "status": RentalRequestStatus.ACCEPTED,
        "days": 5,
    },
]


async def seed_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables ensured.")

    async with async_session_factory() as session:
        result = await session.execute(select(func.count()).select_from(City))
        if result.scalar() and result.scalar() > 0:
            print("Data already exists. Skipping seed.")
            return

        print("Creating cities...")
        city_map: dict[str, City] = {}
        for name, name_tj in CITIES_DATA:
            city = City(name=name, name_tj=name_tj)
            session.add(city)
            await session.flush()
            city_map[name] = city
            print(f"  + City: {name} (id={city.id})")

        print("Creating districts...")
        district_map: dict[str, District] = {}
        for city_name, district_names in DISTRICTS_DATA.items():
            city = city_map[city_name]
            for d_name in district_names:
                dist = District(city_id=city.id, name=d_name)
                session.add(dist)
                await session.flush()
                district_map[f"{city_name}:{d_name}"] = dist
                print(f"  + District: {d_name} ({city_name})")

        print("Creating categories and subcategories...")
        category_map: dict[str, Category] = {}
        subcategory_map: dict[str, SubCategory] = {}
        for cat_data in CATEGORIES_DATA:
            cat = Category(
                name=cat_data["name"],
                name_tj=cat_data.get("name_tj"),
                icon=cat_data.get("icon"),
            )
            session.add(cat)
            await session.flush()
            category_map[cat_data["name"]] = cat
            print(f"  + Category: {cat_data['name']} (id={cat.id})")
            for sub_name in cat_data.get("subcategories", []):
                sub = SubCategory(category_id=cat.id, name=sub_name)
                session.add(sub)
                await session.flush()
                subcategory_map[f"{cat_data['name']}:{sub_name}"] = sub
                print(f"    + Subcategory: {sub_name}")

        print("Creating users...")
        hashed = hash_password(DEFAULT_PASSWORD)
        user_map: dict[str, User] = {}
        for u_data in USERS_DATA:
            user = User(
                email=u_data["email"],
                phone=u_data.get("phone"),
                hashed_password=hashed,
                external_user_id=str(uuid.uuid4()),
                role=u_data["role"],
                display_name=u_data["display_name"],
                is_verified=u_data.get("is_verified", False),
                is_active=True,
                rating_sum=0,
                rating_count=0,
            )
            session.add(user)
            await session.flush()
            user_map[u_data["email"]] = user
            print(f"  + User: {u_data['display_name']} ({u_data['role'].value})")

        print("Creating listings...")
        listing_objects: list[Listing] = []
        owner_users = [u for u in user_map.values() if u.role in (UserRole.OWNER, UserRole.ADMIN)]
        random.seed(42)

        for l_data in LISTINGS_DATA:
            owner = user_map[l_data["owner_email"]]
            city = city_map[l_data["city"]]
            district = district_map.get(f"{l_data['city']}:{l_data['district']}") if l_data.get("district") else None
            category = category_map[l_data["category"]]
            subcategory = subcategory_map.get(f"{l_data['category']}:{l_data['subcategory']}") if l_data.get("subcategory") else None

            listing = Listing(
                owner_id=owner.id,
                category_id=category.id,
                subcategory_id=subcategory.id if subcategory else None,
                city_id=city.id,
                district_id=district.id if district else None,
                title=l_data["title"],
                description=l_data["description"],
                price=l_data["price"],
                price_unit=l_data["price_unit"],
                deposit=l_data["deposit"],
                address=l_data.get("address"),
                status=ListingStatus.ACTIVE,
                is_verified=l_data.get("is_verified", False),
                views_count=l_data.get("views_count", random.randint(10, 500)),
                rating_sum=0,
                rating_count=0,
                contact_phone=owner.phone,
                contact_name=owner.display_name,
            )
            session.add(listing)
            await session.flush()
            listing_objects.append(listing)

            img = ListingImage(
                listing_id=listing.id,
                image_url="/uploads/placeholder.jpg",
                is_primary=True,
                sort_order=0,
            )
            session.add(img)
            print(f"  + Listing: {l_data['title'][:40]}... (id={listing.id})")

        await session.flush()

        print("Creating reviews...")
        reviewers = [u for u in user_map.values() if u.role == UserRole.CUSTOMER]
        review_listings = random.sample(listing_objects, min(len(REVIEWS_DATA), len(listing_objects)))
        for i, listing in enumerate(review_listings):
            if i >= len(REVIEWS_DATA):
                break
            r_data = REVIEWS_DATA[i]
            reviewer = reviewers[i % len(reviewers)]
            review = Review(
                customer_id=reviewer.id,
                listing_id=listing.id,
                rating=r_data["rating"],
                comment=r_data["comment"],
            )
            session.add(review)
            listing.rating_sum = float(listing.rating_sum) + r_data["rating"]
            listing.rating_count += 1
            owner = None
            for u in owner_users:
                if u.id == listing.owner_id:
                    owner = u
                    break
            if owner:
                owner.rating_sum += r_data["rating"]
                owner.rating_count += 1
            print(f"  + Review: {listing.title[:30]}... ({r_data['rating']}★)")

        print("Creating favorites...")
        favorite_count = 0
        for reviewer in reviewers:
            num_favorites = random.randint(2, 5)
            sampled_listings = random.sample(listing_objects, min(num_favorites, len(listing_objects)))
            for listing in sampled_listings:
                existing = await session.execute(
                    select(Favorite).where(Favorite.user_id == reviewer.id, Favorite.listing_id == listing.id)
                )
                if not existing.scalar_one_or_none():
                    fav = Favorite(user_id=reviewer.id, listing_id=listing.id)
                    session.add(fav)
                    favorite_count += 1
        print(f"  + {favorite_count} favorites created")

        print("Creating rental requests...")
        owner_listings = {}
        for listing in listing_objects:
            if listing.owner_id not in owner_listings:
                owner_listings[listing.owner_id] = []
            owner_listings[listing.owner_id].append(listing)

        req_count = 0
        for i, r_data in enumerate(RENTAL_REQUESTS_DATA):
            if req_count >= len(RENTAL_REQUESTS_DATA):
                break
            reviewer = reviewers[i % len(reviewers)]
            available_owners = [o for o in owner_listings if o != reviewer.id]
            if not available_owners:
                continue
            chosen_owner = random.choice(available_owners)
            chosen_listing = random.choice(owner_listings[chosen_owner])
            today = date.today()
            start = today + timedelta(days=random.randint(1, 14))
            end = start + timedelta(days=r_data["days"])
            total_price = float(chosen_listing.price) * r_data["days"]

            rr = RentalRequest(
                listing_id=chosen_listing.id,
                renter_id=reviewer.id,
                owner_id=chosen_owner,
                start_date=start,
                end_date=end,
                total_days=r_data["days"],
                total_price=total_price,
                deposit_amount=float(chosen_listing.deposit),
                message=r_data["message"],
                status=r_data["status"],
            )
            session.add(rr)
            req_count += 1
            print(f"  + RentalRequest: {chosen_listing.title[:30]}... ({r_data['status'].value})")

        await session.commit()
        print("\nSeed completed successfully!")
        print(f"  Cities: {len(city_map)}")
        print(f"  Districts: {len(district_map)}")
        print(f"  Categories: {len(category_map)}")
        print(f"  Subcategories: {len(subcategory_map)}")
        print(f"  Users: {len(user_map)}")
        print(f"  Listings: {len(listing_objects)}")
        print(f"  Reviews: {len(REVIEWS_DATA)}")
        print(f"  Favorites: {favorite_count}")
        print(f"  Rental Requests: {req_count}")


if __name__ == "__main__":
    asyncio.run(seed_database())
