import { IBoardConfigRepository } from '@/lib/repositories/board-config.repository';
import { BoardConfigClientLocal } from './boardconfig-client-local';
import { BoardConfigClientServer } from '@/lib/repositories/client/boardconfig-client-server';

export function getBoardConfigClient(): IBoardConfigRepository {
  return process.env.NEXT_PUBLIC_PERSISTENCE_MODE &&
    process.env.NEXT_PUBLIC_PERSISTENCE_MODE === 'server' ?
    new BoardConfigClientServer() :
    new BoardConfigClientLocal();
}