import { test } from "node:test"; import assert from "node:assert/strict";
import { Money, allocate, CurrencyMismatchError, InvalidAmountError } from "./index.js";
test("fromMinor",()=>{assert.equal(Money.fromMinor(1050,"EGP").amountMinor,1050);});
test("rejects non-int",()=>{assert.throws(()=>Money.fromMinor(10.5,"EGP"),InvalidAmountError);});
test("add/sub",()=>{const a=Money.fromMinor(1000,"EGP"),b=Money.fromMinor(250,"EGP");assert.equal(a.add(b).amountMinor,1250);});
test("mismatch",()=>{assert.throws(()=>Money.fromMinor(1,"EGP").add(Money.fromMinor(1,"USD")),CurrencyMismatchError);});
test("bps",()=>{assert.equal(Money.fromMinor(10000,"EGP").multiplyByBps(500).amountMinor,500);assert.equal(Money.fromMinor(335,"EGP").multiplyByBps(1000).amountMinor,34);});
test("allocate",()=>{const p=allocate(Money.fromMinor(100,"EGP"),[1,1,1]);assert.equal(p.reduce((s,x)=>s+x.amountMinor,0),100);});