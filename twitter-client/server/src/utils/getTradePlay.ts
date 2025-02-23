import { createClient } from "@supabase/supabase-js";
import { TradePlay } from "../types.js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getTradePlay(id: string): Promise<TradePlay | undefined> {
    console.log(`Fetching recipes for chefs with id: ${id}`);
    const { data, error } = await supabase
        .from('trade_plays')
        .select('*')
        .eq('id', id).single();

    if (error) {
        console.error(`Error fetching recipes: ${error.message}`);
        return undefined;
    }
    console.log(`Tade Play fetched successfully: ${JSON.stringify(data)}`);
    return data;

}