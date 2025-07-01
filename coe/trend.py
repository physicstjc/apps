import streamlit as st
import pandas as pd
import requests
import plotly.express as px

# Set up Streamlit page
st.set_page_config(page_title="COE Premium Trends", layout="centered")
st.title("📈 COE Premium Trends by Vehicle Class and Year")

# Define dataset API URL
dataset_id = "d_69b3380ad7e51aff3a7dcc84eba52b8a"
url = f"https://data.gov.sg/api/action/datastore_search?resource_id={dataset_id}&limit=10000"

# Load data with caching
@st.cache_data
def load_data():
    response = requests.get(url)
    data = response.json()
    records = data["result"]["records"]
    df = pd.DataFrame(records)

    # Process columns
    df["date"] = pd.to_datetime(df["month"])
    df["year"] = df["date"].dt.year
    df["premium"] = pd.to_numeric(df["quota_premium"], errors="coerce")
    df = df.dropna(subset=["premium"])
    df["date_mmdd"] = df["date"].dt.strftime("%m-%d")
    
    return df

# Load and prepare data
df = load_data()

# Dropdown for vehicle class
vehicle_classes = sorted(df["vehicle_class"].unique())
selected_class = st.selectbox("Select Vehicle Class", vehicle_classes)

# Filter by selected class
filtered_df = df[df["vehicle_class"] == selected_class]

# Plot with Plotly
fig = px.line(
    filtered_df,
    x="date_mmdd",
    y="premium",
    color="year",
    markers=True,
    title=f"COE Premiums for '{selected_class}' Over the Years",
    labels={"premium": "Premium (S$)", "date_mmdd": "Date (MM-DD)", "year": "Year"}
)

fig.update_layout(
    xaxis_tickangle=-45,
    legend_title_text="Year",
    height=500
)

# Display chart
st.plotly_chart(fig, use_container_width=True)
