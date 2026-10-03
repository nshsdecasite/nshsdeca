import { HomeScreen } from "@/components/deca/home-screen";
import { getSiteStats } from "@/lib/site-stats";

export default async function HomePage() {
  const stats = await getSiteStats();
  return <HomeScreen stats={stats} />;
}
