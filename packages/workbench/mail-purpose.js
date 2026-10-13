import path from 'node:path';
export function mailPurpose(file){
 const name=String(file.filename||''),subject=String(file.subject||'').replace(/^(?:Re:|Fwd?:|回复:|转发:)\s*/gi,''),ext=path.extname(name).toLowerCase();
 const labels={'.pdf':'PDF 文档','.docx':'Word 文档','.doc':'Word 文档','.md':'Markdown 文档','.txt':'文字文档','.pptx':'演示文稿','.ppt':'演示文稿','.xlsx':'数据表格','.xls':'数据表格','.csv':'数据表格','.apk':'安卓安装包','.html':'网页文件','.js':'程序代码','.py':'程序代码','.zip':'项目或文件压缩包','.7z':'项目或文件压缩包','.rar':'项目或文件压缩包','.svg':'矢量图','.png':'图片','.jpg':'图片','.jpeg':'图片','.webp':'图片','.mp4':'视频','.mp3':'音频'};
 const label=labels[ext]||'附件';
 const text=name+' '+subject;
 const rules=[[/DSH|Harness|deepseek/i,'DSH 功能、配置或交付材料'],[/token|用量|计量/i,'AI Token 用量统计或相关工具'],[/AI.?Coding|FOA|算力|GPU|昇腾/i,'AI 编程、算力或解决方案材料'],[/简历|resume|求职/i,'求职简历或个人介绍'],[/安全|审计|audit|backup|备份/i,'安全检查、审计或备份材料'],[/述职|汇报|report|周报/i,'工作总结或汇报材料'],[/报价|合同|商务|proposal/i,'商务方案、报价或合作材料'],[/宣讲|X.?Park|Token空间|门店/i,'活动宣讲或空间合作材料'],[/体重|weight|热量/i,'健康记录或热量工具'],[/地图|globe|global/i,'地图、地点或个人网站项目'],[/UI|界面|设计|design/i,'界面设计或视觉材料']];
 const matched=rules.find(([rule])=>rule.test(text));
 return {title:name.replace(/[_-]+/g,' ').replace(/\.[^.]+$/,''),purpose:matched?`${matched[1]}，${label}。`:`${label}，邮件主题：${subject||'未记录主题'}。`,purposeBasis:'根据文件名与邮件标题归纳，尚未读取附件正文'};
}
