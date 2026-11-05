/** How thick the morning mist is at an hour of the island day: none before
 * 5:30, thickest around 7:00, gone by 9:30. */
export const mistAt = (hour: number) => (hour < 5.5 || hour > 9.5 ? 0 : hour < 7 ? (hour - 5.5) / 1.5 : 1 - (hour - 7) / 2.5);
