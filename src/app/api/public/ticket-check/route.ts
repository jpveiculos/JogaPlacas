import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@/lib/auth/session";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, public, max-age=0"};
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]/g,"");
function status(line:{prizeCents:number|null;prizeCreditedAt:Date|null},roundStatus:string){if(line.prizeCents!==null&&line.prizeCents>0&&line.prizeCreditedAt)return "PREMIADA";if(roundStatus!=="COMPLETED")return "AGUARDANDO_RESULTADO";if(line.prizeCents===null||!line.prizeCreditedAt)return "AGUARDANDO_APURACAO";return "NAO_PREMIADA"}
function safe(line:any){const r=line.participation.round;return {id:line.id,plateFormat:line.plateFormat,plateDisplay:line.plateDisplay,roundCode:r.code,resultAt:r.resultAt.toISOString(),roundStatus:r.status,resultLegacyPlate:r.resultLegacyPlate,resultMercosurPlate:r.resultMercosurPlate,status:status(line,r.status),prizeCents:line.prizeCreditedAt&&(line.prizeCents??0)>0?line.prizeCents:null}}
export async function GET(request:NextRequest){
 const raw=(request.nextUrl.searchParams.get("q")??"").trim();
 if(raw.length<3||raw.length>80)return NextResponse.json({error:"Digite o código do recibo ou a placa apostada."},{status:400,headers});
 try{
  if(/^JP-[A-Z0-9]{8,32}$/i.test(raw.replace(/\s/g,""))){
   const purchase=await authPrisma.purchase.findUnique({where:{receiptCode:raw.replace(/\s/g,"").toUpperCase()},select:{status:true,participations:{where:{status:"CONFIRMED"},select:{round:{select:{code:true,status:true,resultAt:true,resultLegacyPlate:true,resultMercosurPlate:true}},lines:{select:{id:true,plateFormat:true,plateDisplay:true,prizeCents:true,prizeCreditedAt:true}}},orderBy:{round:{resultAt:"desc"}}}});
   if(!purchase||purchase.status!=="CONFIRMED")return NextResponse.json({found:false,results:[],message:"Não encontramos um recibo confirmado com esse código. Confira e tente novamente."},{headers});
   const results=purchase.participations.flatMap(p=>p.lines.map(l=>safe({...l,participation:{round:p.round}})));
   return NextResponse.json({found:true,searchType:"RECIBO",results,message:results.length?"Confira abaixo cada placa e seu resultado.":"Este recibo não possui placas confirmadas para consulta."},{headers});
  }
  const plate=normalize(raw);
  if(plate.length<5||plate.length>7)return NextResponse.json({error:"Digite uma placa válida ou um código de recibo iniciado por JP-."},{status:400,headers});
  const lines=await authPrisma.participationLine.findMany({where:{normalizedPlate:plate,participation:{is:{status:"CONFIRMED",purchase:{is:{status:"CONFIRMED"}}}}},select:{id:true,plateFormat:true,plateDisplay:true,prizeCents:true,prizeCreditedAt:true,participation:{select:{round:{select:{code:true,status:true,resultAt:true,resultLegacyPlate:true,resultMercosurPlate:true}}}}},orderBy:[{participation:{round:{resultAt:"desc"}}},{id:"desc"}],take:20});
  const results=lines.map(l=>safe(l));
  return NextResponse.json({found:results.length>0,searchType:"PLACA",results,message:results.length?"Encontramos apostas confirmadas com essa placa. Confira cada rodada.":"Não encontramos apostas confirmadas com essa placa. Confira se digitou corretamente."},{headers});
 }catch{return NextResponse.json({error:"Não foi possível consultar agora. Tente novamente."},{status:500,headers})}
}