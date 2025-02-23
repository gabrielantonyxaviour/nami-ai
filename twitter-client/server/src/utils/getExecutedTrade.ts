import { createClient } from "@supabase/supabase-js";
import { ExecutedTrade } from "../types.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchExecutedTrade(
  id: string
): Promise<ExecutedTrade | undefined> {
  console.log(id)
  const { data: trade, error } = await supabase
    .from('executed_trades')
    .select('*')
    .eq('id', id).single()

  if (error) {
    throw new Error(`Error fetching executed trade: ${error.message}`)
  }
  const { data: trade_play, error: playsError } = await supabase
    .from('trade_plays')
    .select(`
    *,
    chef:chefs(
      username
    )
`)
    .in('id', [trade.trade_play_id]).single()

  if (playsError) {
    throw new Error(`Error fetching trade plays: ${playsError.message}`)
  }

  return { ...trade, trade_play } as ExecutedTrade
}
