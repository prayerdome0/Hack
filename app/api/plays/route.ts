import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireUser, apiError } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const decoded = await requireUser(request);
    const body = await request.json() as { songId?: string };
    if (!body.songId || !/^[A-Za-z0-9_-]{1,180}$/.test(body.songId)) return new Response('Invalid song id', { status: 400 });
    const db = getAdminDb();
    const songRef = db.collection('songs').doc(body.songId);
    const recentRef = db.collection('recentlyPlayed').doc(`${decoded.uid}_${body.songId}`);
    await db.runTransaction(async (transaction) => {
      const song = await transaction.get(songRef);
      if (!song.exists || song.data()?.published !== true) throw new Error('Song is not available.');
      transaction.update(songRef, { playCount: FieldValue.increment(1) });
      transaction.set(recentRef, { userId: decoded.uid, songId: body.songId, lastPlayedAt: FieldValue.serverTimestamp(), playCount: FieldValue.increment(1) }, { merge: true });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
