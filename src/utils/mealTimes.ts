import { safeFormat } from "./SafeDateUtils";
import { MealType } from "../types/meals";

export const getTargetTimeForMeal = (date: Date, type: MealType): Date => {
  const dateStr = safeFormat(date, "yyyy-MM-dd");
  const target = new Date(dateStr);

  switch (type) {
    case "breakfast":
      target.setHours(8, 0, 0, 0);
      break;
    case "lunch":
      target.setHours(13, 0, 0, 0);
      break;
    case "snack":
      target.setHours(16, 0, 0, 0);
      break;
    case "dinner":
      target.setHours(19, 30, 0, 0);
      break;
    default:
      target.setHours(12, 0, 0, 0);
      break;
  }

  return target;
};
