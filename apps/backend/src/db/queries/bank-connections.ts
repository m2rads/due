// apps/backend/src/db/queries/bank_connections.ts
import { db } from '../index';
import { bankConnections } from '../schema/bank-connections';
import { eq, and, isNull } from 'drizzle-orm';
import type { BankConnection } from '@due/types';

export async function createBankConnection(
  userId: string,
  data: {
    plaidAccessToken: string;
    plaidItemId: string;
    institutionId: string;
    institutionName?: string;
  }
): Promise<BankConnection> {
  const [connection] = await db
    .insert(bankConnections)
    .values({
      userId,
      plaidAccessToken: data.plaidAccessToken,
      plaidItemId: data.plaidItemId,
      institutionId: data.institutionId,
      institutionName: data.institutionName,
      status: 'active',
      itemStatus: 'good',
      lastStatusUpdate: new Date(),
    })
    .returning({
      id: bankConnections.id,
      userId: bankConnections.userId,
      plaidAccessToken: bankConnections.plaidAccessToken,
      plaidItemId: bankConnections.plaidItemId,
      institutionId: bankConnections.institutionId,
      institutionName: bankConnections.institutionName,
      status: bankConnections.status,
      itemStatus: bankConnections.itemStatus,
      lastStatusUpdate: bankConnections.lastStatusUpdate,
      errorCode: bankConnections.errorCode,
      errorMessage: bankConnections.errorMessage,
      createdAt: bankConnections.createdAt,
      updatedAt: bankConnections.updatedAt,
      deletedAt: bankConnections.deletedAt,
      deleteReason: bankConnections.deleteReason,
    });

  return connection as BankConnection;
}

export async function getBankConnection(
  userId: string,
  connectionId: string
): Promise<BankConnection | null> {
  const [connection] = await db
    .select({
      id: bankConnections.id,
      userId: bankConnections.userId,
      plaidAccessToken: bankConnections.plaidAccessToken,
      plaidItemId: bankConnections.plaidItemId,
      institutionId: bankConnections.institutionId,
      institutionName: bankConnections.institutionName,
      status: bankConnections.status,
      itemStatus: bankConnections.itemStatus,
      lastStatusUpdate: bankConnections.lastStatusUpdate,
      errorCode: bankConnections.errorCode,
      errorMessage: bankConnections.errorMessage,
      createdAt: bankConnections.createdAt,
      updatedAt: bankConnections.updatedAt,
      deletedAt: bankConnections.deletedAt,
      deleteReason: bankConnections.deleteReason,
    })
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, userId),
        eq(bankConnections.id, connectionId),
        isNull(bankConnections.deletedAt)
      )
    );

  return connection as BankConnection | null;
}

export async function getUserBankConnections(
  userId: string
): Promise<BankConnection[]> {
  const connections = await db
    .select({
      id: bankConnections.id,
      userId: bankConnections.userId,
      plaidAccessToken: bankConnections.plaidAccessToken,
      plaidItemId: bankConnections.plaidItemId,
      institutionId: bankConnections.institutionId,
      institutionName: bankConnections.institutionName,
      status: bankConnections.status,
      itemStatus: bankConnections.itemStatus,
      lastStatusUpdate: bankConnections.lastStatusUpdate,
      errorCode: bankConnections.errorCode,
      errorMessage: bankConnections.errorMessage,
      createdAt: bankConnections.createdAt,
      updatedAt: bankConnections.updatedAt,
      deletedAt: bankConnections.deletedAt,
      deleteReason: bankConnections.deleteReason,
    })
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, userId),
        isNull(bankConnections.deletedAt)
      )
    );

  return connections as BankConnection[];
}

export async function updateBankConnection(
  connectionId: string,
  data: Partial<{
    itemStatus: string;
    lastStatusUpdate: Date;
    errorCode: string | null;
    errorMessage: string | null;
    status: 'active' | 'inactive';
  }>
): Promise<BankConnection> {
  const [connection] = await db
    .update(bankConnections)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(bankConnections.id, connectionId))
    .returning({
      id: bankConnections.id,
      userId: bankConnections.userId,
      plaidAccessToken: bankConnections.plaidAccessToken,
      plaidItemId: bankConnections.plaidItemId,
      institutionId: bankConnections.institutionId,
      institutionName: bankConnections.institutionName,
      status: bankConnections.status,
      itemStatus: bankConnections.itemStatus,
      lastStatusUpdate: bankConnections.lastStatusUpdate,
      errorCode: bankConnections.errorCode,
      errorMessage: bankConnections.errorMessage,
      createdAt: bankConnections.createdAt,
      updatedAt: bankConnections.updatedAt,
      deletedAt: bankConnections.deletedAt,
      deleteReason: bankConnections.deleteReason,
    });

  // Convert nulls to undefined
  return {
    ...connection,
    institutionName: connection.institutionName ?? undefined,
    errorCode: connection.errorCode ?? undefined,
    errorMessage: connection.errorMessage ?? undefined,
    deletedAt: connection.deletedAt ?? undefined,
    deleteReason: connection.deleteReason ?? undefined,
  } as BankConnection;
}

export async function unlinkBankConnection(
  userId: string,
  connectionId: string,
  reason?: string
): Promise<void> {
  await db
    .update(bankConnections)
    .set({
      status: 'inactive',
      deletedAt: new Date(),
      deleteReason: reason || 'user_requested',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(bankConnections.id, connectionId),
        eq(bankConnections.userId, userId)
      )
    );
}

export async function checkDuplicateConnection(
  userId: string,
  institutionId: string
): Promise<boolean> {
  const [connection] = await db
    .select()
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, userId),
        eq(bankConnections.institutionId, institutionId),
        isNull(bankConnections.deletedAt)
      )
    );

  return !!connection;
}