import pickle
from natto import MeCab
from sklearn.feature_extraction.text import TfidfVectorizer

# カテゴリ値とカテゴリ名の対応
categories = {
    1 : "women",
    2 : "IT",
    3 : "men",
    4 : "movie",
    5 : "sports",
    6 : "misc"
}

# vectorizerで用いる
def tokenize(text):
    tokens = []
    with MeCab('-F%f[0],%f[6]') as nm:
        for n in nm.parse(text, as_nodes=True):
            # ignore any end-of-sentence nodes
            if not n.is_eos() and n.is_nor():
                klass, word = n.feature.split(',', 1)
                if klass in ['名詞', '形容詞', '形容動詞', '動詞']:
                    tokens.append(word)

    return tokens

# vectorizerのロード
vectorizer = pickle.load(open("vectorizer.pkl", "rb"))
# 学習済みモデルのロード
clf = pickle.load(open("model.pkl", "rb"))

# テストの入力
input_data = [
   """本日のテーマMicrosoftFlow#MicrosoftFlowJapanSharePointGroup
   本日のゴールMicrosoftFlowというサービスを知ってもらうなにができそうかを知ってもらう
   JapanSharePointGroupMicrosoftFlowというサービスを知ってもらうなにができそうかを知ってもらう
   JapanSharePointGroupSharePointGroup""",
    """セ・パ交流戦、ロッテ６－９ヤクルト、３回戦、ロッテ２勝１敗、１１日、ゾゾマリン）１０連敗中だったヤクルトは新外国人、デービッド・ブキャナン投手（２７）が７回２失点で今季３勝目（４敗）。
    ２番・上田剛史外野手（２８）が３安打４打点と活躍するなど打線もつながった。
    泥沼の大型連敗をストップし、交流戦１２試合目にしてようやく初勝利となった。(サンケイスポーツ)
    """,
    """政府の郵政民営化委員会（委員長・岩田一政日本経済研究センター理事長）は、
    ゆうちょ銀行が総務省と金融庁に新規業務として申請した個人向け無担保融資について、
    「実施に問題はない」とする意見を表明する方針を固めた。関係筋が10日明らかにした。
    14日にも開く民営化委で正式に意見書をまとめ、高市早苗総務相と森信親金融庁長官に提出する。(時事通信)""",
    """　国連の特別報告者らが日本政府の方針に批判的な見解を示し、
    政府がその都度、反論するケースが相次いだ。「共謀罪」の成立要件を改めたテロ等準備罪を新設する組織犯罪処罰法改正案や特定秘密保護法、
    慰安婦問題に関する日韓合意が取り上げられ、政府の対決姿勢を野党が批判している。(毎日新聞)"""
]

# 特徴ベクトルに変換
input_matrix = vectorizer.transform(input_data)
# カテゴリ予測　返り値はカテゴリ値
categoriesNum = clf.predict(input_matrix)
# カテゴリ値 -> カテゴリ名に変換
categoriesName = []
for i in categoriesNum:
    categoriesName.append(categories[i])
# カテゴリ名を返す
print(categoriesName)
