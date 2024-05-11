import { useDispatch, useSelector } from "react-redux";

import { configureStore } from "@reduxjs/toolkit";
import noteReducer from "./note-slice";

export const store = configureStore({
  reducer: {
    note: noteReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
