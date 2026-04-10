import streamlit as st
import subprocess
import os
import sys

st.set_page_config(page_title="MetaGPT 本地可视化界面", page_icon="🤖", layout="wide")

st.title("🤖 MetaGPT 本地虚拟软件公司")
st.markdown("在这里输入你的软件需求，AI 团队将在本地为你全自动生成架构和代码。")

prompt = st.text_area("你的软件需求是什么？", "写一个基于 Python 的命令行五子棋游戏", height=100)

if st.button("🚀 开始生成项目", type="primary"):
    if not prompt.strip():
        st.warning("请输入具体的软件需求")
    else:
        st.info("AI 团队已开始工作，这可能需要几分钟时间，请关注下方的工作日志...")
        
        log_container = st.empty()
        log_text = ""
        
        try:
            # We use python3 -m metagpt to avoid local PATH issues with pip binaries
            process = subprocess.Popen(
                [sys.executable, "-m", "metagpt", prompt],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=os.path.expanduser("~/") 
            )
            
            # Streaming the output
            for line in process.stdout:
                log_text += line
                display_text = "\n".join(log_text.split("\n")[-50:])
                log_container.code(display_text, language="bash")
                
            process.wait()
            
            if process.returncode == 0:
                st.success("🎉 生成完成！项目代码和设计文档已储存在您本地硬盘的 `~/workspace` 目录下。")
            else:
                st.error("⚠️ 生成过程中出现了一些问题，请查看上方的日志寻求排查。")
                
        except Exception as e:
            st.error(f"发生未知错误: {e}")

st.markdown("---")
st.caption("基于 Python + Streamlit 实时渲染的本地 MetaGPT UI 操作台")
