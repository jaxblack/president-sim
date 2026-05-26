import { NextResponse } from 'next/server';
import { defaultFedState } from '@/lib/fed';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(defaultFedState());
}
