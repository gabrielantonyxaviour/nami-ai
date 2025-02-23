import { StateCreator } from "zustand";
interface GlobalState {
  overallDonations: number;
}

interface GlobalActions {
  setOverallDonations: (overallDonations: number) => void;
}

export type GlobalSlice = GlobalState & GlobalActions;

export const initialGlobalState: GlobalState = {
  overallDonations: 0,
};

export const createGlobalSlice: StateCreator<
  GlobalSlice,
  [],
  [],
  GlobalSlice
> = (set) => ({
  ...initialGlobalState,
  setOverallDonations: (overallDonations) => set({ overallDonations }),
});
