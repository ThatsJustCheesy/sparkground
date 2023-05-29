import { Expr, hole, s } from "../ast/ast";
import { ProgSymbol } from "../symbol-table";

// https://inst.eecs.berkeley.edu/~cs61a/sp19/articles/scheme-builtins.html#pair-and-list-manipulation
// Extracted with ChatGPT, thx lol
export const symbols = {
  define: {
    id: "define",
    doc: "Variable or function definition",

    headingArgCount: 1,

    special: "define",
  },
  if: {
    id: "if",
    doc: "Conditional",

    headingArgCount: 1,
    bodyArgHints: ["then", "else"],
  },
  // "atom?": {
  //   id: "atom?",
  //   doc: "Returns true if arg is a boolean, number, symbol, string, or nil; false otherwise.",
  // },
  // "boolean?": {
  //   id: "boolean?",
  //   doc: "Returns true if arg is a boolean; false otherwise.",
  // },
  // "integer?": {
  //   id: "integer?",
  //   doc: "Returns true if arg is a integer; false otherwise.",
  // },
  // "null?": {
  //   id: "null?",
  //   doc: "Returns true if arg is nil (the empty list); false otherwise.",
  // },
  // append: {
  //   id: "append",
  // },
  // list: {
  //   id: "list",
  // },
  // car: {
  //   id: "car",
  //   doc: "Head (first element) of the given list",
  // },
  // cdr: {
  //   id: "cdr",
  //   doc: "Tail (all except first element) of the given list",
  // },

  apply: {
    id: "apply",
    doc: "Calls procedure with the given list of args.",
  },
  display: {
    id: "display",
    doc: "Prints val. If val is a Scheme string, it will be output without quotes.",
  },
  error: {
    id: "error",
    doc: "Raises an SchemeError with msg as it's message. If there is no msg,",
  },
  eval: {
    id: "eval",
    doc: "Evaluates expression in the current environment.",
  },
  exit: {
    id: "exit",
    doc: "Exits the interpreter. In the web interpreter, this does nothing.",
  },
  load: {
    id: "load",
    doc: "Loads the contents of the file with filename and evaluates the code within.",
  },
  newline: {
    id: "newline",
    doc: "Prints a new line.",
  },
  print: {
    id: "print",
    doc: "Prints the Scheme representation of val. Unlike display, this will include",
  },
  "atom?": {
    id: "atom?",
    doc: "Returns true if arg is a boolean, number, symbol, string, or nil;",
  },
  "boolean?": {
    id: "boolean?",
    doc: "Returns true if arg is a boolean; false otherwise.",
  },
  "integer?": {
    id: "integer?",
    doc: "Returns true if arg is a integer; false otherwise.",
  },
  "list?": {
    id: "list?",
    doc: "Returns true if arg is a well-formed list (i.e., it doesn't contain",
  },
  "number?": {
    id: "number?",
    doc: "Returns true if arg is a number; false otherwise.",
  },
  "null?": {
    id: "null?",
    doc: "Returns true if arg is nil (the empty list); false otherwise.",
  },
  "pair?": {
    id: "pair?",
    doc: "Returns true if arg is a pair; false otherwise.",
  },
  "procedure?": {
    id: "procedure?",
    doc: "Returns true if arg is a procedure; false otherwise.",
  },
  "promise?": {
    id: "promise?",
    doc: "Returns true if arg is a promise; false otherwise.",
  },
  "string?": {
    id: "string?",
    doc: "Returns true if arg is a string; false otherwise.",
  },
  "symbol?": {
    id: "symbol?",
    doc: "Returns true if arg is a symbol; false otherwise.",
  },
  append: {
    id: "append",
    doc: "Returns the result of appending the items of all lsts in order into a single",
  },
  car: {
    id: "car",
    doc: "Returns the car of pair. Errors if pair is not a pair.",
  },
  cdr: {
    id: "cdr",
    doc: "Returns the cdr of pair. Errors if pair is not a pair.",
  },
  cons: {
    id: "cons",
    doc: "Returns a new pair with first as the car and rest as the cdr",
  },
  length: {
    id: "length",
    doc: "Returns the length of arg. If arg is not a list, this",
  },
  list: {
    id: "list",
    doc: "Returns a list with the items in order as its elements.",
  },
  map: {
    id: "map",
    doc: "Returns a list constructed by calling proc (a one-argument",
  },
  filter: {
    id: "filter",
    doc: "Returns a list consisting of only the elements of lst that",
  },
  reduce: {
    id: "reduce",
    doc: "Returns the result of sequentially combining each element in lst",
  },
  "set-car!": {
    id: "set-car!",
    doc: "Sets the car of pair to value. pair must be a pair.",
  },
  "set-cdr!": {
    id: "set-cdr!",
    doc: "Sets the cdr of pair to value. pair must be a pair.",
  },
  "+": {
    id: "+",
    doc: "Returns the sum of all nums. Returns 0 if there are none. If any num is not",
  },
  "-": {
    id: "-",
    doc: "If there is only one num, return its negation. Otherwise, return the first",
  },
  "*": {
    id: "*",
    doc: "Returns the product of all nums. Returns 1 if there are none. If any num is",
  },
  "/": {
    id: "/",
    doc: "If there are no divisors, return 1 divided by dividend. Otherwise, return",
  },
  abs: {
    id: "abs",
    doc: "Returns the absolute value of num, which must be a number.",
  },
  expt: {
    id: "expt",
    doc: "Returns the base raised to the power power. Both must be numbers.",
  },
  modulo: {
    id: "modulo",
    doc: "Returns a modulo b. Both must be numbers.",
  },
  quotient: {
    id: "quotient",
    doc: "Returns dividend integer divided by divisor. Both must be numbers.",
  },
  remainder: {
    id: "remainder",
    doc: "Returns the remainder that results when dividend is integer divided by",
  },
  "eq?": {
    id: "eq?",
    doc: "If a and b are both numbers, booleans, symbols, or strings, return true if",
  },
  "equal?": {
    id: "equal?",
    doc: "Returns true if a and b are equivalent. For two pairs, they are equivalent",
  },
  not: {
    id: "not",
    doc: "Returns true if arg is false-y or false if arg is truthy.",
  },
  "=": {
    id: "=",
    doc: "Returns true if a equals b. Both must be numbers.",
  },
  "<": {
    id: "<",
    doc: "Returns true if a is less than b. Both must be numbers.",
  },
  ">": {
    id: ">",
    doc: "Returns true if a is greater than b. Both must be numbers.",
  },
  "<=": {
    id: "<=",
    doc: "Returns true if a is less than or equal to b. Both must be numbers.",
  },
  ">=": {
    id: ">=",
    doc: "Returns true if a is greater than or equal to b. Both must be numbers.",
  },
  "even?": {
    id: "even?",
    doc: "Returns true if num is even. num must be a number.",
  },
  "odd?": {
    id: "odd?",
    doc: "Returns true if num is odd. num must be a number.",
  },
  "zero?": {
    id: "zero?",
    doc: "Returns true if num is zero. num must be a number.",
  },
  force: {
    id: "force",
    doc: "Returns the evaluated result of promise. If promise has already been",
  },
  "cdr-stream": {
    id: "cdr-stream",
    doc: "Shorthand for (force (cdr <stream>)).",
  },
  backward: {
    id: "backward",
    doc: "Moves the turtle backward n units in its current direction from its current",
  },
  begin_fill: {
    id: "begin_fill",
    doc: "Starts a sequence of moves that outline a shape to be filled.",
  },
  bgcolor: {
    id: "bgcolor",
    doc: "Sets the background color of the turtle window to a color c (same rules as",
  },
  circle: {
    id: "circle",
    doc: "Draws a circle of radius r, centered r units to the turtle's left.",
  },
  clear: {
    id: "clear",
    doc: "Clears the drawing, leaving the turtle unchanged.",
  },
  color: {
    id: "color",
    doc: 'Sets the pen color to c, which is a Scheme string such as "red" or "#ffc0c0".',
  },
  end_fill: {
    id: "end_fill",
    doc: "Fill in shape drawn since last call to begin_fill.",
  },
  exitonclick: {
    id: "exitonclick",
    doc: "Sets the turtle window to close when it is clicked. This has no effect on the",
  },
  forward: {
    id: "forward",
    doc: "Moves the turtle forward n units in its current direction from its current",
  },
  hideturtle: {
    id: "hideturtle",
    doc: "Makes the turtle invisible.",
  },
  left: {
    id: "left",
    doc: "Rotates the turtle's heading n degrees counterclockwise.",
  },
  pendown: {
    id: "pendown",
    doc: "Lowers the pen so that the turtle starts drawing.",
  },
  penup: {
    id: "penup",
    doc: "Raises the pen so that the turtle does not draw.",
  },
  pixel: {
    id: "pixel",
    doc: "Draws a box filled with pixels starting at (x, y) in color c (same rules",
  },
  pixelsize: {
    id: "pixelsize",
    doc: "Changes the size of the box drawn by pixel to be sizexsize.",
  },
  rgb: {
    id: "rgb",
    doc: "Returns a color string formed from r, g, and b values between 0 and 1.",
  },
  right: {
    id: "right",
    doc: "Rotates the turtle's heading n degrees clockwise.",
  },
  screen_width: {
    id: "screen_width",
    doc: "Returns the width of the turtle screen in pixels of the current size.",
  },
  screen_height: {
    id: "screen_height",
    doc: "Returns the height of the turtle screen in pixels of the current size.",
  },
  setheading: {
    id: "setheading",
    doc: "Sets the turtle's heading h degrees clockwise from the north.",
  },
  setposition: {
    id: "setposition",
    doc: "Moves the turtle to position (x, y) without changing its heading.",
  },
  showturtle: {
    id: "showturtle",
    doc: "Makes the turtle visible.",
  },
  speed: {
    id: "speed",
    doc: "Sets the turtle's animation speed to some value between 0 and 10 with 0",
  },
} satisfies Record<string, ProgSymbol>;

const _ = symbols;

// TODO: Hack
const emptyIdentifier: ProgSymbol = {
  id: "…",
  headingArgCount: 1,
};

export const library: Expr[] = [
  s(_.define, hole),
  s(_.if, hole, hole, hole),

  true,
  false,
  // TODO: Enable once supported
  // null,

  s(_["apply"], hole, hole),
  s(_["display"], hole),
  s(_["error"], hole),
  s(_["eval"], hole),
  s(_["exit"], hole),
  s(_["load"], hole),
  s(_["newline"], hole),
  s(_["print"], hole),
  s(_["atom?"], hole),
  s(_["boolean?"], hole),
  s(_["integer?"], hole),
  s(_["list?"], hole),
  s(_["number?"], hole),
  s(_["null?"], hole),
  s(_["pair?"], hole),
  s(_["procedure?"], hole),
  s(_["promise?"], hole),
  s(_["string?"], hole),
  s(_["symbol?"], hole),
  s(_["append"], hole),
  s(_["car"], hole),
  s(_["cdr"], hole),
  s(_["cons"], hole, hole),
  s(_["length"], hole),
  s(_["list"], hole),
  s(_["map"], hole, hole),
  s(_["filter"], hole, hole),
  s(_["reduce"], hole, hole),
  s(_["set-car!"], hole, hole),
  s(_["set-cdr!"], hole, hole),
  s(_["+"], hole),
  s(_["-"], hole),
  s(_["*"], hole),
  s(_["/"], hole),
  s(_["abs"], hole),
  s(_["expt"], hole, hole),
  s(_["modulo"], hole, hole),
  s(_["quotient"], hole, hole),
  s(_["remainder"], hole, hole),
  s(_["eq?"], hole, hole),
  s(_["equal?"], hole, hole),
  s(_["not"], hole),
  s(_["="], hole, hole),
  s(_["<"], hole, hole, hole),
  s(_[">"], hole, hole),
  s(_["<="], hole, hole, hole),
  s(_[">="], hole, hole),
  s(_["even?"], hole),
  s(_["odd?"], hole),
  s(_["zero?"], hole),
  s(_["force"], hole),
  s(_["cdr-stream"], hole),
  s(_["backward"], hole),
  s(_["begin_fill"], hole),
  s(_["bgcolor"], hole),
  s(_["circle"], hole),
  s(_["clear"], hole),
  s(_["color"], hole),
  s(_["end_fill"], hole),
  s(_["exitonclick"], hole),
  s(_["forward"], hole),
  s(_["hideturtle"], hole),
  s(_["left"], hole),
  s(_["pendown"], hole),
  s(_["penup"], hole),
  s(_["pixel"], hole, hole, hole),
  s(_["pixelsize"], hole),
  s(_["rgb"], hole, hole, hole),
  s(_["right"], hole),
  s(_["screen_width"], hole),
  s(_["screen_height"], hole),
  s(_["setheading"], hole),
  s(_["setposition"], hole, hole),
  s(_["showturtle"], hole),
  s(_["speed"], hole),
];
