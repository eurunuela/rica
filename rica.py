from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components
from bokeh.layouts import column, row
from bokeh.models import CustomJS, Div
from nilearn import plotting
from nilearn.image import index_img, load_img
from plotly.subplots import make_subplots
from streamlit_bokeh import streamlit_bokeh

import io_utils
from plotting import dynamic_plots

color_mapping = {"accepted": "#2ecc71", "rejected": "#e74c3c", "ignored": "#3498db"}


def find_metrics_file(folder: str, ends_with: str) -> Path | None:
    p = Path(folder)
    if not p.exists() or not p.is_dir():
        return None
    for f in sorted(p.iterdir()):
        if f.is_file() and f.name.endswith(ends_with):
            return f
    return None


def main():
    # Check for selection changes in query params to trigger rerun
    current_selected = st.query_params.get("selected", "")
    if (
        "last_selected" not in st.session_state
        or st.session_state.last_selected != current_selected
    ):
        st.session_state.last_selected = current_selected
        st.rerun()

    selected_components = []
    for x in current_selected.split(","):
        if x:
            parts = x.split("_")
            if len(parts) > 1:
                selected_components.append(int(parts[1]))
            else:
                selected_components.append(int(x))

    # Hidden trigger for rerun
    trigger = st.checkbox(
        "Trigger", key="trigger_checkbox", value=False, label_visibility="hidden"
    )
    # Hide the checkbox with CSS
    st.markdown(
        """<style> .stCheckbox {display: none;} </style>""", unsafe_allow_html=True
    )

    st.set_page_config(page_title="Rica", layout="wide")
    st.title("Rica")

    st.markdown(
        "Enter a folder path on the machine where Streamlit runs. The app will look for a file that ends with `desc-tedana_metrics.tsv` and display it."
    )

    folder = st.text_input("Server folder path", value="")
    if st.button("Load metrics TSV") or st.session_state.get("loaded", False):
        if not st.session_state.get("loaded", False):
            if not folder:
                st.error("Please enter a folder path.")
                return

            comp_ts_path = find_metrics_file(folder, "desc-ICA_mixing.tsv")
            comp_ts_df = pd.read_csv(comp_ts_path, sep="\t", encoding="utf=8")
            n_vols, n_comps = comp_ts_df.shape

            metrics_file = find_metrics_file(folder, "desc-tedana_metrics.tsv")

            ica_nii = find_metrics_file(folder, "desc-ICA_components.nii.gz")

            ica_nii_img = load_img(ica_nii)

            # The number of components should match the 4th dimension of the NIfTI image
            if ica_nii_img.shape[3] != n_comps:
                st.error(
                    f"Number of components in {comp_ts_path.name} ({n_comps}) does not match the 4th dimension of {ica_nii.name} ({ica_nii_img.shape[3]}). Please check your files."
                )
                return

            # Load the cross component metrics, including the kappa & rho elbows
            cross_component_metrics_path = find_metrics_file(
                folder, "desc-ICACrossComponent_metrics.json"
            )
            cross_comp_metrics_dict = io_utils.load_json(cross_component_metrics_path)

            # Store in session state
            st.session_state.loaded = True
            st.session_state.metrics_file = metrics_file
            st.session_state.n_comps = n_comps
            st.session_state.ica_nii = ica_nii
            st.session_state.ica_nii_img = ica_nii_img
            st.session_state.cross_comp_metrics_dict = cross_comp_metrics_dict
            st.session_state.comp_ts_df = comp_ts_df
        else:
            # Retrieve from session state
            metrics_file = st.session_state.metrics_file
            n_comps = st.session_state.n_comps
            ica_nii = st.session_state.ica_nii
            ica_nii_img = st.session_state.ica_nii_img
            cross_comp_metrics_dict = st.session_state.cross_comp_metrics_dict
            comp_ts_df = st.session_state.comp_ts_df

        # Load metrics file and use a single shared ColumnDataSource so selections link
        comptable_cds = dynamic_plots._create_data_struct(metrics_file)

        # Ensure the color column matches the classification
        comptable_cds.data["color"] = [
            color_mapping.get(c, "#000000") for c in comptable_cds.data["classif"]
        ]

        selected_indices = []
        if selected_components:
            for comp in selected_components:
                try:
                    idx = comptable_cds.data["component"].index(str(comp))
                    selected_indices.append(idx)
                except ValueError:
                    pass
        comptable_cds.selected.indices = selected_indices

        kappa_elbow = dynamic_plots.get_elbow_val(
            cross_comp_metrics_dict, "kappa_elbow"
        )
        rho_elbow = dynamic_plots.get_elbow_val(cross_comp_metrics_dict, "rho_elbow")

        # Create plots using the shared CDS
        kappa_rho_plot = dynamic_plots._create_kr_plt(
            comptable_cds, kappa_elbow=kappa_elbow, rho_elbow=rho_elbow
        )

        kappa_sorted_plot = dynamic_plots._create_sorted_plt(
            comptable_cds,
            n_comps,
            "kappa_rank",
            "kappa",
            title="Kappa Rank",
            x_label="Components sorted by Kappa",
            y_label="Kappa",
            elbow=kappa_elbow,
        )
        rho_sorted_plot = dynamic_plots._create_sorted_plt(
            comptable_cds,
            n_comps,
            "rho_rank",
            "rho",
            title="Rho Rank",
            x_label="Components sorted by Rho",
            y_label="Rho",
            elbow=rho_elbow,
        )
        varexp_pie_plot = dynamic_plots._create_varexp_pie_plt(comptable_cds)

        # Load nii file using nilearn

        # Create a Div to show selected component ID(s)
        selected_div = Div(text="Selected: None", width=800)

        # CustomJS callback to update the Div and query params when selection changes
        cb = CustomJS(
            args=dict(source=comptable_cds, div=selected_div),
            code="""
            const inds = cb_obj.indices;
            console.log('Selection changed:', inds);
            const data = source.data;
            let components = '';
            for (let i = 0; i < inds.length; i++) {
                const idx = inds[i];
                if (data['component'] && data['component'][idx] !== undefined) {
                    const selected = data['component'][idx];
                    const selected_padded = String(selected).padStart(3, '0');
                    const selected_padded_C = 'ica_' + selected_padded;
                    components += selected_padded_C;
                    if (i < inds.length - 1) components += ',';
                    console.log('Selected component:', selected);
                }
            }
            // Update parent query params
            const parentUrl = new URL(window.parent.location.href);
            parentUrl.searchParams.set('selected', components);
            window.parent.history.replaceState(null, '', parentUrl);
            console.log('Updated parent URL to:', parentUrl.toString());
            // Trigger rerun by toggling the hidden checkbox in parent
            const checkbox = window.parent.document.querySelector('input[type="checkbox"]');
            if (checkbox) {
                console.log('Found checkbox in parent, clicking');
                checkbox.click();
            } else {
                console.log('Checkbox not found in parent');
            }
            """,
        )

        # Attach callback to the selection of the comptable CDS
        comptable_cds.selected.js_on_change("indices", cb)

        # Compose a single layout so all models belong to the same document
        layout = column(
            row(kappa_rho_plot, varexp_pie_plot),
            row(kappa_sorted_plot, rho_sorted_plot),
            sizing_mode="stretch_width",
        )

        if selected_components:
            selected_comp = str(selected_components[0])
            # Create a centered div to show selected component
            st.markdown(
                """
                <div style="border: 1px solid #83c5fc; background-color: #d0e9ff; padding: 1em; border-radius: 5px; text-align: center; max-width: 30%; margin-left: auto; margin-right: auto; margin-bottom: 1em;">
                Selected component: <strong>{selected_comp}</strong>
                </div>
                """.format(
                    selected_comp=selected_comp
                ),
                unsafe_allow_html=True,
            )

        # Render the layout in the left half of the Streamlit page so plots occupy the left column
        left_col, right_col = st.columns([1, 1])
        with left_col:
            streamlit_bokeh(layout)

        # On the right, show the map if a component is selected
        with right_col:
            if selected_components:
                selected_comp = str(selected_components[0])
                # Components are usually 1-indexed in filenames
                comp_index = selected_components[0]
                comp_col = f"ICA_{comp_index:02d}"
                # For classif it should be just the number, not padded and not ICA_XXX
                accep_rejec = comptable_cds.data["classif"][comp_index]
                line_color = color_mapping.get(accep_rejec, "#000000")
                if 0 <= comp_index < ica_nii_img.shape[3]:

                    comp_nii = index_img(ica_nii_img, comp_index)

                    # Use nilearn to plot the component spatial map
                    # fig = plotting.plot_stat_map(comp_nii)
                    view = plotting.view_img(
                        comp_nii,
                        bg_img=None,
                        # display_mode="mosaic",
                        # cut_coords=5,
                        vmax=comp_nii.get_fdata().max() * 0.1,
                        # cmap=png_cmap,
                        # symmetric_cbar=True,
                        colorbar=True,
                        draw_cross=False,
                        annotate=False,
                        resampling_interpolation="nearest",
                    )
                    # view = plotting.view_img_on_surf(
                    #     comp_nii, surf_mesh="fsaverage", threshold=None, cmap="RdBu_r"
                    # )
                    # Render interactive plot HTML in Streamlit
                    st.markdown(
                        '<div style="margin-bottom: 0px;">', unsafe_allow_html=True
                    )
                    components.html(view.html, height=400)
                    st.markdown("</div>", unsafe_allow_html=True)

                    # Just below the brain plot, plot the time series of the selected component
                    # from comp_ts_df in the top subplot, and its one-sided FFT in the bottom subplot.
                    ts_fig = make_subplots(
                        rows=2,
                        cols=1,
                        subplot_titles=(
                            f"Time Series {selected_comp}",
                            "One-sided FFT",
                        ),
                        vertical_spacing=0.5,
                    )
                    # The color should be based on whether the component is accepted or rejected
                    ts_fig.add_trace(
                        go.Scatter(
                            y=comp_ts_df[comp_col],
                            mode="lines",
                            name="Time Series",
                            line=dict(color=line_color),
                        ),
                        row=1,
                        col=1,
                    )
                    # Compute one-sided FFT
                    ts_data = comp_ts_df[comp_col].values
                    n = len(ts_data)
                    freq = np.fft.rfftfreq(n)
                    fft_values = np.fft.rfft(ts_data)
                    ts_fig.add_trace(
                        go.Scatter(
                            x=freq,
                            y=np.abs(fft_values),
                            mode="lines",
                            name="One-sided FFT",
                            line=dict(color=line_color),
                        ),
                        row=2,
                        col=1,
                    )
                    # Update layout
                    ts_fig.update_layout(height=400, showlegend=False)
                    ts_fig.update_xaxes(title_text="Time (volumes)", row=1, col=1)
                    ts_fig.update_xaxes(title_text="Frequency (Hz)", row=2, col=1)
                    ts_fig.update_yaxes(title_text="Amplitude", row=1, col=1)
                    ts_fig.update_yaxes(title_text="Amplitude", row=2, col=1)
                    st.plotly_chart(ts_fig, use_container_width=True)

                else:
                    st.error(
                        f"Component index {comp_index} is out of bounds for the NIfTI image."
                    )
            else:
                st.info(
                    f"Select a component from the plots to view its spatial map. Selected components {selected_components}"
                )


if __name__ == "__main__":
    main()
