from __future__ import annotations

from bergenomap.app import create_app


# Keep module-level `app` for gunicorn compatibility: `Backend:app`
app = create_app()


if __name__ == "__main__":
    print(
        "Example request to transform map: "
        "http://127.0.0.1:5000/transform?angle=0&border=465&path=../maps/png/tur-o-2024/2024-astveitskogen-tur-o.png"
    )
    app.run(debug=True)


