import { View, Text, ScrollView, StyleSheet } from "react-native";

export default function Instruction() {
    return(

        <View style={styles.instructionBox}>
    <View style={styles.instructionHeader}>
      <Text style={styles.instructionTitle}>🎮 HOW TO PLAY</Text>
      <Text style={styles.instructionTag}>GAME GUIDE</Text>
    </View>

    <ScrollView
      style={styles.instructionScroll}
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.instructionItem}>
        <Text style={styles.instructionNumber}>01</Text>
        <View style={styles.instructionContent}>
          <Text style={styles.instructionHeading}>Join the Game</Text>
          <Text style={styles.instructionText}>
            Wait for at least 2 players to join the room. The host can start the
            game.
          </Text>
        </View>
      </View>

      <View style={styles.instructionItem}>
        <Text style={styles.instructionNumber}>02</Text>
        <View style={styles.instructionContent}>
          <Text style={styles.instructionHeading}>Discover Mystery Items</Text>
          <Text style={styles.instructionText}>
            Each round reveals a mystery item. Check its picture and description
            carefully.
          </Text>
        </View>
      </View>

      <View style={styles.instructionItem}>
        <Text style={styles.instructionNumber}>03</Text>
        <View style={styles.instructionContent}>
          <Text style={styles.instructionHeading}>Place Your Bid</Text>
          <Text style={styles.instructionText}>
            Take your turn and choose how many coins you want to bid. You can
            also pass your turn.
          </Text>
        </View>
      </View>

      <View style={styles.instructionItem}>
        <Text style={styles.instructionNumber}>04</Text>
        <View style={styles.instructionContent}>
          <Text style={styles.instructionHeading}>Win the Auction</Text>
          <Text style={styles.instructionText}>
            The highest bidder wins the mystery item when the auction ends.
          </Text>
        </View>
      </View>

      <View style={styles.instructionItem}>
        <Text style={styles.instructionNumber}>05</Text>
        <View style={styles.instructionContent}>
          <Text style={styles.instructionHeading}>Reveal the Value</Text>
          <Text style={styles.instructionText}>
            The item's actual value is revealed to the winner. Your winning bid
            is deducted and the item's value is added to your balance.
          </Text>
        </View>
      </View>

      <View style={styles.instructionItem}>
        <Text style={styles.instructionNumber}>06</Text>
        <View style={styles.instructionContent}>
          <Text style={styles.instructionHeading}>Play More Rounds</Text>
          <Text style={styles.instructionText}>
            Keep bidding on mystery items and try to build the highest coin
            balance!
          </Text>
        </View>
      </View>
    </ScrollView>

    <Text style={styles.scrollHint}>SWIPE TO READ MORE ↓</Text>
  </View>
)
}

const styles = StyleSheet.create({
  instructionBox: {
    backgroundColor: "#102338",
    borderWidth: 1,
    borderColor: "#24536D",
    borderRadius: 18,
    padding: 15,
    marginTop: 22,
    marginBottom: 10,
    height: 200,
  },

  instructionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  instructionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  instructionTag: {
    color: "#00D9FF",
    fontSize: 9,
    fontWeight: "900",
    backgroundColor: "#163B50",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  instructionScroll: {
    flex: 1,
  },

  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  instructionNumber: {
    color: "#00D9FF",
    fontSize: 14,
    fontWeight: "900",
    backgroundColor: "#173B50",
    padding: 9,
    borderRadius: 9,
    overflow: "hidden",
    marginRight: 12,
  },

  instructionContent: {
    flex: 1,
  },

  instructionHeading: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },

  instructionText: {
    color: "#A8B7CA",
    fontSize: 11,
    lineHeight: 17,
  },

  scrollHint: {
    color: "#00D9FF",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1,
    marginTop: 8,
  },
});
