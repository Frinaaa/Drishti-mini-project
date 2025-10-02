import sys
import json
import argparse


def main():
    parser = argparse.ArgumentParser(description='DeepFace worker: performs find and prints JSON result')
    parser.add_argument('img_path')
    parser.add_argument('db_path')
    parser.add_argument('model_name')
    parser.add_argument('confidence_threshold', type=float)
    args = parser.parse_args()

    try:
        from deepface import DeepFace  # type: ignore
    except Exception as e:
        print(json.dumps({'status': 'error', 'error': f'DeepFace import failed: {e}'}))
        sys.exit(2)

    try:
        dfs = DeepFace.find(
            img_path=args.img_path,
            db_path=args.db_path,
            model_name=args.model_name,
            enforce_detection=True
        )

        if not dfs or dfs[0].empty:
            print(json.dumps({'status': 'no_match'}))
            sys.exit(0)

        best_match = dfs[0].iloc[0]
        identity = best_match['identity']
        distance = float(best_match['distance'])
        confidence = 1.0 - distance

        out = {
            'status': 'match',
            'identity': identity,
            'distance': distance,
            'confidence': confidence
        }
        print(json.dumps(out))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({'status': 'error', 'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
