import { test } from "node:test"; import assert from "node:assert/strict";
import { bookingMachine, paymentMachine, rideMachine } from "./machines.js";
import { BookingStatus, PaymentStatus, RideStatus } from "./enums.js";
import { IllegalTransitionError } from "./state-machine.js";
test("booking happy",()=>{let s=BookingStatus.DRAFT;s=bookingMachine.transition(s,BookingStatus.PENDING_APPROVAL,{});s=bookingMachine.transition(s,BookingStatus.CONFIRMING,{});assert.equal(bookingMachine.transition(s,BookingStatus.CONFIRMED,{}),BookingStatus.CONFIRMED);});
test("booking forbidden jump",()=>{assert.throws(()=>bookingMachine.transition(BookingStatus.DRAFT,BookingStatus.CONFIRMED,{}),IllegalTransitionError);});
test("payment no skip",()=>{assert.throws(()=>paymentMachine.transition(PaymentStatus.AUTHORIZED,PaymentStatus.SETTLED,{}),IllegalTransitionError);});
test("ride happy",()=>{let s=RideStatus.REQUESTED;s=rideMachine.transition(s,RideStatus.MATCHING,{});s=rideMachine.transition(s,RideStatus.DRIVER_ASSIGNED,{});s=rideMachine.transition(s,RideStatus.IN_PROGRESS,{});assert.equal(rideMachine.transition(s,RideStatus.COMPLETED,{}),RideStatus.COMPLETED);});