"use client";
import { useAuth } from "@/lib/auth";
import { PlanSettings } from "@/components/seller-settings";
import { StudioHeader } from "@/components/studio-ui";

export default function StudioPlan() {
  const { user } = useAuth();
  const store = user!.seller!.type === "STORE";
  return (
    <>
      <StudioHeader title={store ? "Plan & billing" : "Open a store"} sub="Free for individual sellers. Stores are billed monthly; cancel anytime and you go back to selling free, with your listings still up." />
      <PlanSettings user={user!} />
    </>
  );
}
