// Approximate total minutes for the standard recipe.
export const recipeMinutes=[15,15,10,40,35,45,55,35,5,35,25,55,30,45,35,30,10,15,25,25];

export function cookingSteps(description) {
  return description.split(/(?<=\.)\s+(?=[А-ЯЁ])/u);
}
