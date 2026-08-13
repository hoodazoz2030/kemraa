export interface ApiError{error:{code:string;message:string;requestId:string;details:Record<string,unknown>;retryable:boolean;};}
export interface Paginated<T>{items:T[];total:number;page:number;pageSize:number;}
export type UUID=string;export type ISODateTime=string;