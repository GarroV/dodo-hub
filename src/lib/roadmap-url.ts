// Адрес выдачи плана. Публичный и без токенов (решение владельца 28.09.2026).
// Эндпоинт — GarroV/Swarm-brain#562; пока он не выкачен, сайт показывает
// «план временно недоступен».
import { HUB_BOARD_ID, SWARM_ORIGIN } from './swarm.mjs';

export const ROADMAP_URL: string =
  import.meta.env.PUBLIC_ROADMAP_URL || `${SWARM_ORIGIN}/functions/v1/swarm-api/public/roadmap/${HUB_BOARD_ID}`;
