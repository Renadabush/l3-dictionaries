import { AppExp, CExp, Exp, isAppExp, isAtomicExp, isBoolExp, isCExp, isDefineExp, isDictArray, isDictExp, isIfExp, isLetExp, isLitExp, isNumExp, isProcExp, isStrExp, isVarRef, makeAppExp, makeBinding, makeDefineExp, makeIfExp, makeLetExp, makeLitExp, makeProcExp, makeProgram, makeVarRef, parseL32, Program } from './L32/L32-ast';
import { CompoundSExp, EmptySExp, isEmptySExp, makeCompoundSExp, makeEmptySExp, makeSymbolSExp, SExpValue } from './L32/L32-value';
import { DictArray, DictExp, unparseL32 } from './L32/L32-ast';
import { map } from 'ramda';
import fs from"fs"
import { isOk } from './shared/result';
import { isPrimOp } from './L3/L3-ast';

const helperCode = `
(L32
  (define symbol?
    (lambda (x)
      (not (or (number? x) (boolean? x) (string? x)))))

  (define dict?
    (lambda (d)
      (if (eq? d '())
          #t
          (if (pair? d)
              (if (pair? (car d))
                  (if (symbol? (car (car d)))
                      (dict? (cdr d))
                      #f)
                  #f)
              #f))))

  (define get
    (lambda (d k)
      (if (not (dict? d))
          (error k)
          (if (eq? d '())
              (error k)
              (if (eq? (car (car d)) k)
                  (cdr (car d))
                  (get (cdr d) k)))))) 

  (define dict
    (lambda (d)
      (lambda (k)
        (get d k))))

  
  (define error
    (lambda (msg)
      #f))
)
`;

/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/
export const Dict2App  = (exp: Program) : Program =>{
    //@TODO
     const x=parseL32(helperCode);
     if(isOk(x))
         return makeProgram([...x.value.exps,...exp.exps.map(rewriteDictExp)])
     return makeProgram(exp.exps.map(rewriteDictExp))
   
}



/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/


export const L32toL3 = (prog : Program): Program => 
    Dict2App(prog);
  



const listToCompoundSExp = (exps: SExpValue[]): SExpValue => {
    return exps.length === 0
        ? makeEmptySExp()
        : makeCompoundSExp(exps[0], listToCompoundSExp(exps.slice(1)));
};

export const cexpToSExp = (exp: CExp): SExpValue => {
    if (isNumExp(exp)) return exp.val;
    if (isBoolExp(exp)) return exp.val;
    if (isStrExp(exp)) return exp.val;
    if (isVarRef(exp)) return makeSymbolSExp(exp.var);
    if (isPrimOp(exp)) return makeSymbolSExp(exp.op);
    if (isLitExp(exp)) return exp.val;

    if (isIfExp(exp)) {
        return listToCompoundSExp([
            makeSymbolSExp('if'),
            cexpToSExp(exp.test),
            cexpToSExp(exp.then),
            cexpToSExp(exp.alt)
        ]);
    }

    if (isAppExp(exp)) {
        return listToCompoundSExp([
            cexpToSExp(exp.rator),
            ...exp.rands.map(cexpToSExp)
        ]);
    }

    if (isProcExp(exp)) {
        const args = listToCompoundSExp(exp.args.map(v => makeSymbolSExp(v.var)));
        return listToCompoundSExp([
            makeSymbolSExp('lambda'),
            args,
            ...exp.body.map(cexpToSExp)
        ]);
    }

    if (isLetExp(exp)) {
        const bindings = exp.bindings.map(b =>
            listToCompoundSExp([makeSymbolSExp(b.var.var), cexpToSExp(b.val)])
        );
        const bindingList = listToCompoundSExp(bindings);
        return listToCompoundSExp([
            makeSymbolSExp('let'),
            bindingList,
            ...exp.body.map(cexpToSExp)
        ]);
    }

    if (isDictArray(exp)) {
        const pairs = exp.val.map((d: DictExp) =>
            listToCompoundSExp([d.var, cexpToSExp(d.val)])
        );
        return listToCompoundSExp([makeSymbolSExp('dict'), ...pairs]);
    }

    
    return makeSymbolSExp("unknown-cexp");
};

const rewriteDictExp = (exp: Exp): Exp =>
    isDefineExp(exp) ? makeDefineExp(exp.var, rewriteDictCExp(exp.val)) :
    isCExp(exp) ? rewriteDictCExp(exp) :
    exp;

const rewriteDictCExp = (exp: CExp): CExp =>
    isAtomicExp(exp) ? exp :
    isLitExp(exp) ? exp :
    isIfExp(exp) ? makeIfExp(rewriteDictCExp(exp.test),
                             rewriteDictCExp(exp.then),
                             rewriteDictCExp(exp.alt)) :
    isAppExp(exp) ? makeAppExp(rewriteDictCExp(exp.rator),
                               exp.rands.map(rewriteDictCExp)) :
    isProcExp(exp) ? makeProcExp(exp.args,
                                 exp.body.map(rewriteDictCExp)) :
      isLetExp(exp) ? makeLetExp(
        exp.bindings.map(b => makeBinding(b.var.var, rewriteDictCExp(b.val))),
        exp.body.map(rewriteDictCExp)) :
    isDictArray(exp) ? dictExpToAppExp(exp) :
    exp;

const dictExpToAppExp = (exp: DictArray): AppExp => Dict2AppTemp(exp)
const dictArrayToListSExp = (arr: DictArray): CompoundSExp | EmptySExp => {
    const pairs = arr.val.map(dictExpToCompoundSExp);

    
    const buildList = (lst: CompoundSExp[]): CompoundSExp | EmptySExp =>
        lst.length === 0 ? makeEmptySExp() :
        makeCompoundSExp(lst[0], buildList(lst.slice(1)));

    return buildList(pairs);
};
export const Dict2AppTemp = (d: DictArray): AppExp =>
    makeAppExp(
        makeVarRef("dict"), 
        [makeLitExp(dictArrayToListSExp(d))] 
    );
const dictExpToCompoundSExp = (d: DictExp): CompoundSExp =>
makeCompoundSExp(d.var, cexpToSExp(d.val));

