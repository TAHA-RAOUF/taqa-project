// Test Supabase Connection for Chat IA
// Run this in the browser console to test your Supabase setup

console.log("🚀 Testing Supabase Chat Integration...");

// Test environment variables
console.log("1. Environment Variables:");
console.log("VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_ANON_KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Set" : "❌ Missing");

// Test basic connection
import { supabaseChatService } from './src/services/supabaseChatService';

async function testConnection() {
  try {
    console.log("\n2. Testing Database Connection...");
    const stats = await supabaseChatService.getStatisticsForAI();
    console.log("✓ Connection successful");
    console.log("Statistics:", stats);
    
    console.log("\n3. Testing Anomalies Query...");
    const anomalies = await supabaseChatService.getAnomaliesForAI({ limit: 3 });
    console.log(`✓ Found ${anomalies.length} anomalies`);
    
    console.log("\n4. Testing Maintenance Windows...");
    const windows = await supabaseChatService.getMaintenanceWindowsForAI();
    console.log(`✓ Found ${windows.length} maintenance windows`);
    
    console.log("\n5. Testing AI Response...");
    const response = await supabaseChatService.getAIResponse("Quelles sont les anomalies critiques?", { statistics: stats });
    console.log("✓ AI Response:", response);
    
    console.log("\n🎉 All tests passed! Your Supabase integration is working correctly.");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.log("\n📋 Troubleshooting:");
    console.log("1. Check your .env file has the correct Supabase URL and key");
    console.log("2. Verify the database schema is set up (run the migration)");
    console.log("3. Check that the Edge Function is deployed");
    console.log("4. Verify your Supabase project is active");
  }
}

// Run the test
testConnection();

// Export for manual testing
window.testSupabaseChat = testConnection;
console.log("\n💡 You can run 'testSupabaseChat()' anytime to test the connection");
