/** Whether the keeper runs. With "run by default" on, Shift walks instead;
 * a controller's trigger and a fully tilted touch stick still always run. */
export const runs = (byDefault: boolean, shiftHeld: boolean, otherHeld: boolean) =>
  byDefault ? !shiftHeld || otherHeld : shiftHeld || otherHeld;
