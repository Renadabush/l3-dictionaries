import { map } from "ramda";
import { Exp, isProgram, Program, isBoolExp, isNumExp, isVarRef, isPrimOp, isProcExp, isIfExp, isAppExp, isDefineExp, PrimOp, CExp } from './L3/L3-ast';
import { Result, makeFailure, makeOk, bind, mapResult,safe2} from './shared/result';

/*
Purpose: Transform L2 AST to JavaScript program string
Signature: l2ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/

export const l2ToJS = (exp: Exp | Program): Result<string>  => 
    isProgram(exp) ? 
    bind(mapResult(l2ToJS, exp.exps), exps => {
        const withSemis = exps.map((e, i) =>
            i < exps.length - 1 ? appendSemicolon(e) : e);
        return makeOk(withSemis.join("\n"));
    }) :

    isBoolExp(exp) ? makeOk(`${exp.val}`) :
    isNumExp(exp) ? makeOk(`${exp.val}`) :
    isVarRef(exp) ? makeOk(exp.var) :
    isPrimOp(exp) ? makeOk(convertPrimOp(exp.op)) :
    isProcExp(exp) ? bind(l2ToJS(exp.body[exp.body.length-1]), body => makeOk(`((${map(p => p.var, exp.args).join(",")}) => ${body})`)) : 
    isIfExp(exp) ? 
        bind(l2ToJS(exp.test), (test : string) =>
        bind(l2ToJS(exp.then), (then : string) =>
        bind(l2ToJS(exp.alt), (alt : string) =>
            makeOk(`(${test} ? ${then} : ${alt})`)))) :
    isAppExp(exp) ? (
         isPrimOp(exp.rator) ? primOpApp2JS(exp.rator, exp.rands) :
         safe2((rator: string, rands: string[]) => makeOk(`${rator}(${rands.join(",")})`))
            (l2ToJS(exp.rator), mapResult(l2ToJS, exp.rands))
         ) :
    isDefineExp(exp) ?
        bind(l2ToJS(exp.val), val =>
            makeOk(`const ${exp.var.var} = ${val}`)) :
    makeFailure(`Unknown expression`);


const convertPrimOp = (op : string) : string =>
    op === "=" || op === "eq?" ? "===" :
    op === "number?" ? "((x) => typeof(x) === 'number')" :
    op === "boolean?" ? "((x) =>typeof(x) === 'boolean')" :
    op;

const primOpApp2JS = (rator : PrimOp, rands : CExp[]) : Result<string> => 
    rator.op === "not" ? bind(l2ToJS(rands[0]), (rand) => makeOk(`(!${rand})`)) :
    rator.op === "number?" || rator.op === "boolean?" ? bind(l2ToJS(rands[0]), (rand) => makeOk(`${convertPrimOp(rator.op)}(${rand})`)) :
    bind(mapResult(l2ToJS,rands), (rands) => makeOk("(" + rands.join(" " + convertPrimOp(rator.op) + " ") + ")"));

    const appendSemicolon = (str: string): string =>
    str.trim().endsWith(";") ? str : `${str};`;