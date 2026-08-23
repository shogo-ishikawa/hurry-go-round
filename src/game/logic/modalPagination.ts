export interface Pagination { page:number; pageSize:number; pageCount:number; start:number; end:number; canPrevious:boolean; canNext:boolean }
/** Deterministic pagination shared by mouse, touch, and keyboard modal navigation. */
export function calculatePagination(itemCount:number,requestedPage:number,viewportHeight:number):Pagination{
  const count=Math.max(0,Math.floor(itemCount)),height=Math.max(0,viewportHeight);
  const pageSize=height<180?1:height<280?3:height<430?5:7,pageCount=Math.max(1,Math.ceil(count/pageSize)),page=Math.max(0,Math.min(pageCount-1,Math.floor(requestedPage)));
  return{page,pageSize,pageCount,start:page*pageSize,end:Math.min(count,(page+1)*pageSize),canPrevious:page>0,canNext:page<pageCount-1};
}
