from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.audit_log import AuditLogRepository


class AuditLogService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AuditLogRepository(db)

    async def log(
        self,
        user_id: int,
        action: str,
        entity_type: str,
        entity_id: int | None = None,
        old_data: dict | None = None,
        new_data: dict | None = None,
    ):
        await self.repo.create(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_data=old_data,
            new_data=new_data,
        )

    async def get_by_entity(self, entity_type: str, entity_id: int):
        return await self.repo.get_by_entity(entity_type, entity_id)

    async def get_by_user(self, user_id: int, skip: int = 0, limit: int = 20):
        return await self.repo.get_by_user(user_id, skip, limit)

    async def get_all(self, skip: int = 0, limit: int = 20):
        return await self.repo.get_all_logs(skip, limit)
